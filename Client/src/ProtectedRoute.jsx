import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const accessLevel = localStorage.getItem("accessLevel");

  console.log("PR", accessLevel);

  // Check if accessLevel is missing, null (as string), or an empty value
  if (!accessLevel || accessLevel === "null") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
