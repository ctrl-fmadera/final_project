import { createContext, useEffect, useState } from "react";
import axios from "axios";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
  const [username, setUsername] = useState("");
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await axios.get("/profile");
        setId(response.data.userId);
        setUsername(response.data.username);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  return (
    <UserContext.Provider value={{ username, setUsername, id, setId, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}
