import {
  Flex,
  TextInput,
  Text,
  Table,
  Button,
  ActionIcon,
  Modal,
  Textarea,
  Popover,
  Box,
  ScrollArea,
  useMantineTheme,
} from "@mantine/core";
import {
  IconCheck,
  IconSquareRoundedMinus,
  IconX,
  IconInfoCircle,
  IconPlus,
  IconAi,
  IconWand,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { AGENT_FAILED, AGENT_LOADING } from "../constants/AgentTableConstants";
import { AgenticTableCell } from "./AgenticTableCell";

const LANGCHAIN_API_KEY = import.meta.env.VITE_LANGCHAIN_API_KEY;
const LANGGRAPH_URL = import.meta.env.VITE_LANGGRAPH_URL;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const AgenticTable = () => {
  const theme = useMantineTheme();
  const [columns, setColumns] = useState<string[]>([]);
  const [newColumn, setNewColumn] = useState<string>("");
  const [newColumnDescription, setNewColumnDescription] = useState<string>("");
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState(false);

  const [targets, setTargets] = useState<string[]>([]);
  const [newTarget, setNewTarget] = useState<string>("");
  const [targetLabel, setTargetLabel] = useState<string>("Target");
  const [newTargetLabel, setNewTargetLabel] = useState<string>(targetLabel);
  const [editingTargetLabel, setEditingTargetLabel] = useState<boolean>(false);

  const [targetData, setTargetData] = useState<
    {
      target: string;
      enrichment_fields: {
        [key: string]:
          | string
          | undefined
          | typeof AGENT_LOADING
          | typeof AGENT_FAILED;
      };
    }[]
  >([]);

  const [columnDescriptions, setColumnDescriptions] = useState<{
    [key: string]: string;
  }>({});
  const [editingColumnDescription, setEditingColumnDescription] = useState<
    string | null
  >(null);
  const [tempDescription, setTempDescription] = useState<string>("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  useEffect(() => {
    const storedSchema = localStorage.getItem("tableSchema");
    if (storedSchema) {
      const { columns } = JSON.parse(storedSchema);
      setColumns(columns.map((col: { name: string }) => col.name));

      // Set column descriptions
      const descriptions = columns.reduce(
        (
          acc: { [key: string]: string },
          col: { name: string; description: string }
        ) => {
          acc[col.name] = col.description;
          return acc;
        },
        {}
      );
      setColumnDescriptions(descriptions);

      // Initialize targetData with an empty array
      setTargetData([]);
    }
  }, []);

  const triggerGetEnrichment = async () => {
    // Step 1: Get the cells which need to be updated -- i.e. cells which have data with value undefined.
    // cellsToUpdate = [ {"target": "LangChain", "enrichment_field": "company_ceo"}, ...]
    const cellsToUpdate = targetData.reduce(
      (acc: { target: string; enrichment_field: string }[], curr) => {
        const cellKeys = Object.keys(curr.enrichment_fields);
        cellKeys.forEach((key) => {
          if (
            curr.enrichment_fields[key] === undefined ||
            curr.enrichment_fields[key] === AGENT_FAILED ||
            curr.enrichment_fields[key] === ""
          ) {
            acc.push({ target: curr.target, enrichment_field: key });
          }
        });

        return acc;
      },
      []
    );

    console.log("Cells to update", cellsToUpdate);

    // Step 2. For each cell, run the query and update the data.
    // Performend asynchronously and in parallel.
    console.log("Updating cells", cellsToUpdate);
    cellsToUpdate.map(
      async (cell: { target: string; enrichment_field: string }) => {
        // 2.0.0 Set all fields to a "Loading" state using a Sentinel value
        setTargetData(
          targetData.map((element) => {
            if (element.target === cell.target) {
              element.enrichment_fields[cell.enrichment_field] = AGENT_LOADING;
            }
            return element;
          })
        );

        // 2.1 Create a new Thread
        console.log("Creating a new thread");
        const threadResponse = await fetch(`${LANGGRAPH_URL}/threads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": LANGCHAIN_API_KEY,
          },
          body: JSON.stringify({
            metadata: {},
          }),
        });
        const threadData = await threadResponse.json();
        const threadID = threadData.thread_id;

        // 2.2 Create a Run
        console.log("Creating a new run");

        console.log("Cell", cell);

        const runResponse = await fetch(
          `${LANGGRAPH_URL}/threads/${threadID}/runs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": LANGCHAIN_API_KEY,
            },
            body: JSON.stringify({
              assistant_id: "agent",
              input: {
                topic: cell.target,
                template_schema: {
                  type: "object",
                  properties: {
                    [cell.enrichment_field]: {
                      type: "string",
                      description:
                        columnDescriptions[cell.enrichment_field] ||
                        `The ${cell.enrichment_field}.`,
                    },
                  },
                  required: [cell.enrichment_field],
                },
                info: {},
              },
            }),
          }
        );

        const runData = await runResponse.json();
        const runID = runData.run_id;

        // 2.3 Wait for the Run to finish
        console.log("Waiting for the run to finish");
        const joinResponse = await fetch(
          `${LANGGRAPH_URL}/threads/${threadID}/runs/${runID}/join`,
          {
            method: "GET",
            headers: {
              "X-Api-Key": LANGCHAIN_API_KEY,
            },
          }
        );
        const joinData = joinResponse.status;
        if (joinData > 299) {
          console.log("Error", joinData);
        }

        // 2.4 Get the result
        const stateResponse = await fetch(
          `${LANGGRAPH_URL}/threads/${threadID}/state`,
          {
            method: "GET",
            headers: {
              "X-Api-Key": LANGCHAIN_API_KEY,
            },
          }
        );
        const stateData = await stateResponse.json();
        console.log("State data", stateData);
        let output = stateData.values.info[cell.enrichment_field];
        if (output === undefined) {
          output = "No data";
        }

        // 2.5 Update the targetData
        setTargetData(
          targetData.map((element) => {
            if (element.target === cell.target) {
              element.enrichment_fields[cell.enrichment_field] = output;
            }
            return element;
          })
        );
      }
    );
  };

  const generateColumnDescription = async (columnName: string) => {
    setIsGeneratingDescription(true);
    try {
      const tableDescription = localStorage.getItem("tableDescription");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate a concise description for a column named "${columnName}" in a table described as: "${tableDescription}". The description should be clear and informative, suitable for use in a data schema.
                    For example, if the column is named "Company Name", the description might be "The name of the company".
                    `,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const generatedDescription =
        data.candidates[0].content.parts[0].text.trim();
      setNewColumnDescription(generatedDescription);
    } catch (error) {
      console.error("Error generating column description:", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <Flex
      direction="column"
      gap="md"
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: theme.colors.dark[7],
      }}
    >
      <Box
        style={{
          top: "10px",
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          padding: "10px",
        }}
      >
        <Button mr="md" onClick={triggerGetEnrichment}>
          <IconWand size="1rem" style={{ marginRight: "0.5rem" }} />
          Get Enrichment
        </Button>

        <Button mr="md" onClick={() => setIsAddTargetModalOpen(true)}>
          <IconPlus size="1rem" />
          Add Target
        </Button>

        <Button onClick={() => setIsAddColumnModalOpen(true)}>
          <IconPlus size="1rem" />
          Add Column
        </Button>
      </Box>
      <ScrollArea style={{ width: "100%", height: "calc(100vh - 60px)" }}>
        <Table
          stickyHeader
          withColumnBorders
          withRowBorders
          style={{ minWidth: "100%" }}
          highlightOnHover
          striped
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{
                  backgroundColor: theme.colors.dark[6],
                  color: theme.colors.gray[0],
                }}
              >
                {editingTargetLabel ? (
                  <TextInput
                    value={newTargetLabel}
                    onChange={(e) => {
                      setNewTargetLabel(e.target.value);
                    }}
                    rightSection={
                      <Flex mr="md">
                        <ActionIcon
                          variant={"transparent"}
                          size="xs"
                          onClick={() => {
                            setEditingTargetLabel(false);
                            setNewTargetLabel(targetLabel);
                          }}
                        >
                          <IconX />
                        </ActionIcon>
                        <ActionIcon
                          variant={"transparent"}
                          size="xs"
                          onClick={() => {
                            setEditingTargetLabel(false);
                            setTargetLabel(newTargetLabel);
                          }}
                        >
                          <IconCheck />
                        </ActionIcon>
                      </Flex>
                    }
                  />
                ) : (
                  <Flex
                    onClick={() => setEditingTargetLabel(true)}
                    align="center"
                    justify="center"
                  >
                    {targetLabel}
                  </Flex>
                )}
              </Table.Th>
              {columns.map((column) => (
                <Table.Th
                  key={column}
                  style={{
                    backgroundColor: theme.colors.dark[6],
                    color: theme.colors.gray[0],
                  }}
                >
                  <Flex justify="center" mb="24px" style={{ display: "block" }}>
                    <Box
                      mb="8px"
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <ActionIcon
                        variant="transparent"
                        m="0px"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingColumnDescription(column);
                          setTempDescription(columnDescriptions[column] || "");
                        }}
                      >
                        <IconInfoCircle size="1rem" />
                      </ActionIcon>
                      <ActionIcon
                        variant="transparent"
                        size="xs"
                        m="0px"
                        onClick={() => {
                          setColumns(
                            columns.filter((element) => element !== column)
                          );
                          setTargetData(
                            targetData.map((element) => {
                              delete element.enrichment_fields[column];
                              return element;
                            })
                          );
                          setColumnDescriptions((prev) => {
                            const newDescriptions = { ...prev };
                            delete newDescriptions[column];
                            return newDescriptions;
                          });
                        }}
                      >
                        <IconSquareRoundedMinus />
                      </ActionIcon>
                    </Box>
                    <Popover position="bottom" withArrow shadow="md">
                      <Popover.Target>
                        <Flex
                          align="center"
                          style={{
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "center",
                            margin: "auto",
                            justifyContent: "center",
                          }}
                        >
                          {column}
                        </Flex>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Text size="sm">
                          {columnDescriptions[column] ||
                            "No description available"}
                        </Text>
                      </Popover.Dropdown>
                    </Popover>
                  </Flex>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {targets.map((target) => (
              <Table.Tr key={target}>
                <Table.Td
                  style={{
                    width: "100px",
                    backgroundColor: theme.colors.dark[8],
                    color: theme.colors.gray[0],
                  }}
                >
                  <Flex align="center" justify="center">
                    <Text fw={"bold"}>{target}</Text>
                    <ActionIcon
                      ml="4px"
                      variant={"transparent"}
                      size="xs"
                      onClick={() => {
                        setTargets(
                          targets.filter((element) => element !== target)
                        );
                        setTargetData(
                          targetData.filter(
                            (element) => element.target !== target
                          )
                        );
                      }}
                    >
                      <IconSquareRoundedMinus />
                    </ActionIcon>
                  </Flex>
                </Table.Td>
                {columns.map((column) => (
                  <AgenticTableCell
                    key={column}
                    target={target}
                    column={column}
                    value={
                      targetData.find((element) => element.target === target)
                        ?.enrichment_fields[column]
                    }
                    setValue={(value) => {
                      setTargetData(
                        targetData.map((element) => {
                          if (element.target === target) {
                            element.enrichment_fields[column] = value;
                          }
                          return element;
                        })
                      );
                    }}
                  />
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      <Modal
        opened={editingColumnDescription !== null}
        onClose={() => setEditingColumnDescription(null)}
        title={`Edit description for ${editingColumnDescription}`}
      >
        <Textarea
          value={tempDescription}
          onChange={(e) => setTempDescription(e.currentTarget.value)}
          placeholder="Enter a description for this field"
          minRows={3}
        />
        <Button
          mt="md"
          onClick={() => {
            if (editingColumnDescription) {
              setColumnDescriptions((prev) => ({
                ...prev,
                [editingColumnDescription]: tempDescription,
              }));
            }
            setEditingColumnDescription(null);
          }}
        >
          Save Description
        </Button>
      </Modal>

      <Modal
        opened={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        title="Add New Column"
      >
        <Flex direction="column" gap="md">
          <TextInput
            label="Column Name"
            placeholder="Enter column name"
            value={newColumn}
            onChange={(e) => setNewColumn(e.target.value)}
          />
          <Textarea
            label="Column Description"
            placeholder="Enter column description"
            value={newColumnDescription}
            onChange={(e) => setNewColumnDescription(e.currentTarget.value)}
            minRows={3}
            rightSection={
              <ActionIcon
                onClick={() => generateColumnDescription(newColumn)}
                loading={isGeneratingDescription}
                disabled={newColumn.length === 0}
              >
                <IconAi size="1rem" />
              </ActionIcon>
            }
          />
          <Button
            onClick={() => {
              if (newColumn) {
                setColumns([...columns, newColumn]);
                setTargetData(
                  targetData.map((element) => {
                    element.enrichment_fields[newColumn] = undefined;
                    return element;
                  })
                );
                setColumnDescriptions((prev) => ({
                  ...prev,
                  [newColumn]: newColumnDescription,
                }));
                setNewColumn("");
                setNewColumnDescription("");
                setIsAddColumnModalOpen(false);
              }
            }}
            disabled={newColumn.length === 0}
          >
            Add Column
          </Button>
        </Flex>
      </Modal>

      <Modal
        opened={isAddTargetModalOpen}
        onClose={() => setIsAddTargetModalOpen(false)}
        title="Add New Target"
      >
        <Flex direction="column" gap="md">
          <TextInput
            label="Target Name"
            placeholder="Enter target name"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
          />
          <Button
            onClick={() => {
              if (newTarget) {
                const newTargets = newTarget.split(",").map((t) => t.trim());
                setTargets((targets) => [...targets, ...newTargets]);

                newTargets.forEach((target) => {
                  setTargetData((targetData) => [
                    ...targetData,
                    {
                      target: target,
                      enrichment_fields: columns.reduce((acc: any, curr) => {
                        acc[curr] = undefined;
                        return acc;
                      }, {}),
                    },
                  ]);
                });

                setNewTarget("");
                setIsAddTargetModalOpen(false);
              }
            }}
            disabled={newTarget.length === 0}
          >
            Add Target
          </Button>
        </Flex>
      </Modal>
    </Flex>
  );
};
