//AppointmentPage
import React, { useEffect, useState } from "react";
import BookAppointment from "./BookAppointment";
import UploadAppointmentPage from "./UploadAppointment";
import AllAppointments from "./AllAppointments";
import Sidebar from "../Sidebar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CurrentFootfalls from "./CuurentFootfalls";

const AppointmentPage = () => {
  const [formVal, setformVal] = useState("");
  const navigate = useNavigate();  const accessLevel = localStorage.getItem('accessLevel');
  if(accessLevel === "nurse" || accessLevel === "camp_nurse")
  {
    return (
      <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
        <Sidebar />
  
        <div className="w-4/5 p-8 overflow-y-auto">
          <div className="flex justify-between mb-8 items-center">
            <h2 className="text-4xl font-bold text-gray-800">Appointments</h2>
            <div>
              {(accessLevel === "nurse" && ["Appointments", "Pending Footfalls","Book Appointment", "Upload"].map(
                (btnText, index) => (
                  <button
                    key={index}
                    className="px-4 py-2 rounded-lg bg-blue-500 me-4 text-white"
                    onClick={() => {
                      setformVal(btnText);
                    }}
                  >
                    {btnText}
                  </button>
                )
              )) ||
              (accessLevel === "camp_nurse" && ["Appointments", "Pending Footfalls"].map(
                (btnText, index) => (
                  <button
                    key={index}
                    className="px-4 py-2 rounded-lg bg-blue-500 me-4 text-white"
                    onClick={() => {
                      setformVal(btnText);
                    }}
                  >
                    {btnText}
                  </button>
                )
              ))}
            </div>
          </div>
  
          <motion.div
            className="bg-white p-8 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {formVal === "Appointments" ? (
              <AllAppointments />
            ) : formVal === "Book Appointment" ? (
              <BookAppointment />
            ) : formVal === "Upload" ? (
              <UploadAppointmentPage />
            ) : formVal === "Pending Footfalls" ?
            (
              <CurrentFootfalls/>
            )
            :(
              <AllAppointments />
            )
            }
          </motion.div>
        </div>
      </div>
    );
  }
  else if(accessLevel === "doctor")
  {
    return (
      <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
        <Sidebar />
  
        <div className="w-4/5 p-6 h-screen overflow-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800">Appointments</h2>
          </div>
          
          <motion.div
            className="bg-white p-8 rounded-lg shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            
              <CurrentFootfalls/>
          </motion.div>
        </div>
      </div>
    );
  }
  else{
    return(
      <section class="bg-white h-full flex items-center dark:bg-gray-900">
    <div class="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
        <div class="mx-auto max-w-screen-sm text-center">
            <h1 class="mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600 dark:text-primary-500">404</h1>
            <p class="mb-4 text-3xl tracking-tight font-bold text-gray-900 md:text-4xl dark:text-white">Something's missing.</p>
            <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">Sorry, we can't find that page. You'll find lots to explore on the home page. </p>
            <button onClick={()=>navigate(-1)} class="inline-flex text-white bg-primary-600 hover:cursor-pointer hover:bg-primary-800 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:focus:ring-primary-900 my-4">Back</button>
        </div>   
    </div>
</section>
    )
  }
};

export default AppointmentPage;