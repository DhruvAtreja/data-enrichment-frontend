import {
  ActionIcon,
  Flex,
  Loader,
  Table,
  TextInput,
  Popover,
  useMantineTheme,
} from "@mantine/core";
import { IconCheck, IconFileX, IconX } from "@tabler/icons-react";
import { memo, useEffect, useState } from "react";
import { AGENT_FAILED, AGENT_LOADING } from "../constants/AgentTableConstants";

/**
 * Represents an AgenticTableCellProps interface.
 */
type AgenticTableCellProps = {
  target: string;
  column: string;
  value: string | undefined | typeof AGENT_LOADING | typeof AGENT_FAILED;
  setValue: (value: string) => void;
};

/**
 * Represents an AgenticTableCell component.
 *
 * This component represents a single cell in the AgenticTable and will be responsible for running the query.
 *
 */
export const AgenticTableCell = memo(function AgenticTableCell({
  target,
  column,
  value,
  setValue,
}: AgenticTableCellProps) {
  const theme = useMantineTheme();
  const [editing, setEditing] = useState<boolean>(false);
  const [cellValue, setCellValue] = useState<string>(value as string);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    setCellValue(value as string);
  }, [value]);

  const handleDelete = () => {
    setValue("");
    setEditing(false);
  };

  const handleConfirm = () => {
    setValue(cellValue);
    setEditing(false);
  };

  return (
    <Popover
      opened={isHovered && !editing}
      position="bottom"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <Table.Td
          key={`${target}-${column}`}
          onClick={() => setEditing(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            backgroundColor: theme.colors.dark[8],
            color: theme.colors.gray[0],
          }}
        >
          {value == AGENT_FAILED && (
            <Flex align="center" justify="center">
              <IconFileX color="red" />
            </Flex>
          )}
          {value == AGENT_LOADING && (
            <Flex align="center" justify="center">
              <Loader size="xs" />
            </Flex>
          )}
          {value !== AGENT_FAILED && value !== AGENT_LOADING && !editing && (
            <Flex align="center" justify="center">
              <span>
                {value
                  ? value.length > 30
                    ? value.slice(0, 30) + "..."
                    : value
                  : ""}
              </span>
            </Flex>
          )}
          {editing && (
            <Flex align="center" justify="center">
              <TextInput
                value={cellValue}
                onChange={(e) => {
                  setCellValue(e.target.value);
                }}
                style={{ width: "100%" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirm();
                  } else if (e.key === "Escape") {
                    setCellValue(value as string);
                    setEditing(false);
                  }
                }}
                styles={{
                  input: {
                    backgroundColor: theme.colors.dark[6],
                    color: theme.colors.gray[0],
                    "&:focus": {
                      borderColor: theme.colors.blue[7],
                    },
                  },
                }}
                rightSection={
                  <Flex mr="md">
                    <ActionIcon
                      variant={"transparent"}
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      color={theme.colors.gray[0]}
                    >
                      <IconX />
                    </ActionIcon>
                    <ActionIcon
                      variant={"transparent"}
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirm();
                      }}
                      color={theme.colors.gray[0]}
                    >
                      <IconCheck />
                    </ActionIcon>
                  </Flex>
                }
              />
            </Flex>
          )}
        </Table.Td>
      </Popover.Target>
      {(value as string) && (value as string).length > 30 && (
        <Popover.Dropdown
          style={{
            width: "auto",
            maxWidth: "400px",
            height: "auto",
            overflow: "wrap",
            wordBreak: "break-all",
            backgroundColor: theme.colors.dark[7],
            color: theme.colors.gray[0],
          }}
        >
          {value as string}
        </Popover.Dropdown>
      )}
    </Popover>
  );
});
