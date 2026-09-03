import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Layout from "./components/Layout";
import Items from "./pages/Items";
import ItemDetail from "./pages/ItemDetail";
import Loans from "./pages/Loans";

function Home() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
      <p className="text-gray-600">Role: {user.role}</p>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/items" element={<Items />} />
      <Route path="/items/:id" element={<ItemDetail />} />
      <Route path="/loans" element={<Loans />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>
  );
}
