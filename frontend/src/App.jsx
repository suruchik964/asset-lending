import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Layout from "./components/Layout";
import Items from "./pages/Items";
import ItemDetail from "./pages/ItemDetail";
import Loans from "./pages/Loans";
import LoanDetail from "./pages/LoanDetail";
import MyLoans from "./pages/MyLoans";
import MyItems from "./pages/MyItems";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";

function Home() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Welcome, {user.name}</h1>
      <p className="text-gray-600">You are signed in as a {user.role.toLowerCase()}.</p>
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
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/items" element={<Items />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/:id" element={<LoanDetail />} />
        <Route path="/my-loans" element={<MyLoans />} />
        <Route path="/my-items" element={<MyItems />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
      </Route>
    </Routes>
  );
}
