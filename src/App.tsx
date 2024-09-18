import "@mantine/core/styles.css";
import {
  MantineProvider,
  TextInput,
  Button,
  Box,
  LoadingOverlay,
  Grid,
  Card,
  Text,
  Image,
  Group,
} from "@mantine/core";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { theme } from "./theme";
import { AgenticTable } from "./components/AgenticTable";
import { useState } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const exampleDescriptions = [
  "A table of top tech companies with their founders and founding years",
  "A list of popular books with their authors and publication dates",
  "An overview of countries with their capitals and populations",
  "A comparison of electric car models with their range and price",
];

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (description: string) => {
    setIsLoading(true);
    try {
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
                    text: `Create an object string for a table based on this description: "${description}". 
                     The schema should include an array of column objects (each with a 'name' and 'description').
                     The answer should be a simple string. Do not format it.
                     The schema should be in the following format:
                     {
                      "columns": [
                        {"name": "column1", "description": "Description of column1"},
                        {"name": "column2", "description": "Description of column2"},
                        {"name": "column3", "description": "Description of column3"}
                      ]
                     }
                     `,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const schemaText = data.candidates[0].content.parts[0].text;
      const schema = JSON.parse(schemaText);

      localStorage.setItem("tableSchema", JSON.stringify(schema));
      localStorage.setItem("tableDescription", description);
      navigate("/table");
    } catch (error) {
      console.error("Error generating schema:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputSubmit = (input: string) => {
    handleSubmit(input);
  };

  const handleBlankTemplate = () => {
    const blankSchema = {
      columns: [
        { name: "Column 1", description: "" },
        { name: "Column 2", description: "" },
        { name: "Column 3", description: "" },
      ],
    };
    localStorage.setItem("tableSchema", JSON.stringify(blankSchema));
    localStorage.setItem("tableDescription", "Blank Template");
    navigate("/table");
  };

  return (
    <Box
      p="xl"
      pos="relative"
      style={{
        backgroundColor: "black",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LoadingOverlay visible={isLoading} />
      <Group
        style={{ position: "absolute", top: "10px", right: "10px" }}
        mb="md"
      >
        <Button onClick={handleBlankTemplate}>Start with Blank Template</Button>
      </Group>
      <Box
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <Text color="white" style={{ fontSize: "3rem", marginBottom: "20px" }}>
          Data Enrichment using LangGraph
        </Text>

        <InputArea onSendMessage={handleInputSubmit} />
      </Box>

      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          src="/langgraph.svg"
          alt="Rounded image"
          radius="10px"
          style={{
            position: "absolute",
            top: "10px",
            left: "30px",
            width: "150px",
            height: "50px",
            objectFit: "contain",
          }}
        />

        <Grid gutter="md" style={{ width: "50%" }}>
          {exampleDescriptions.map((description, index) => (
            <Grid.Col key={index} span={6}>
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                style={{
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  backgroundColor: "#262525",
                  "&:hover": {
                    backgroundColor: "#4c4b4b",
                    transform: "scale(1.05)",
                  },
                }}
                onClick={() => handleSubmit(description)}
              >
                <Text style={{ fontSize: "0.9rem" }} color="dimmed">
                  {description}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

const InputArea = ({
  onSendMessage,
}: {
  onSendMessage: (message: string) => void;
}) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ padding: 0, width: "70%", marginBottom: "100px" }}
    >
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "60px",
            bottom: "5px",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "30px",
              paddingRight: "10px",
              outline: "none",
              backgroundColor: "#2f2f2f",
              color: "white",
              border: "none",
              paddingLeft: "30px",
            }}
            placeholder="Describe your table"
          />
          <button
            type="submit"
            style={{
              position: "absolute",
              right: "10px",
              bottom: "10px",
              width: "40px",
              height: "40px",
              borderRadius: "20px",
              backgroundColor: "#676767",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                fillRule="evenodd"
                d="M11.394 6.68a.857.857 0 0 1 1.212 0l3.857 3.857a.857.857 0 0 1-1.212 1.212l-2.394-2.394v7.36a.857.857 0 0 1-1.714 0v-7.36l-2.394 2.394a.857.857 0 1 1-1.212-1.212z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
};

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/table" element={<AgenticTable />} />
        </Routes>
      </Router>
    </MantineProvider>
  );
}
