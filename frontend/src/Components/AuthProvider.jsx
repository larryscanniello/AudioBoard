import { createContext, useState, useEffect} from 'react';


export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setIsAuthorized({ user: data.user });
        }
      })
      .catch(err => console.error("Error fetching user:", err));
  }, []);

  return (
    <AuthContext value={[isAuthorized, setIsAuthorized]}>
      {children}
    </AuthContext>
  );
}