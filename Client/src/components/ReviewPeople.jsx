import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { motion } from "framer-motion";

const ReviewPeople = () => {
    const [reviews, setReviews] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeStatus, setActiveStatus] = useState("Today");
    const [selectedCategory, setSelectedCategory] = useState(""); // State for selected category

    // Fetch categories
    useEffect(() => {
        fetch("http://localhost:8000/categories/")
            .then((res) => res.json())
            .then((data) => setCategories(data.categories))
            .catch((err) => console.error("Error fetching categories:", err));
    }, []);

    // Fetch reviews based on activeStatus & selectedCategory
    useEffect(() => {
        let url = `http://localhost:8000/reviews/${activeStatus}/`;
        if (selectedCategory) {
            url += `?category=${selectedCategory}`; // Append category as a query param
        }

        fetch(url)
            .then((res) => res.json())
            .then((data) => setReviews(data.reviews))
            .catch((err) => console.error("Error fetching reviews:", err));
    }, [activeStatus, selectedCategory]);

    return (
        <div className="h-screen w-full flex bg-gradient-to-br from-blue-300 to-blue-400">
            <Sidebar />
            <div className="w-4/5 p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800">Review People</h1>
                    <div className="flex gap-4">
                        {["Today", "Tomorrow", "Not Attempted"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setActiveStatus(status)}
                                className={`px-4 py-2 rounded-md ${activeStatus === status
                                    ? "bg-blue-500 text-white hover:bg-blue-600"
                                    : "bg-gray-300 text-gray-700 hover:bg-gray-400 hover:text-gray-800"
                                    } transition duration-300`}
                            >
                                {status} Reviews
                            </button>
                        ))}
                    </div>
                </div>

                <motion.div
                    className="bg-white p-8 rounded-lg shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    
                    <div className="bg-white shadow rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold mb-2 text-gray-700">{activeStatus} Reviews</h2>
                        <div className="mb-4">
                        <label htmlFor="category" className="block text-gray-700 text-sm font-bold mb-2">
                            Select Category:
                        </label>
                        <select
                            id="category"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.name}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    </div>
                        <h3 className="text-md text-gray-500">{selectedCategory || "All Categories"}</h3>
                        <table className="w-full border-collapse">
    <thead>
        <tr className="bg-gray-200">
            <th className="border p-3 text-gray-700 w-1/5 text-center">PID</th>
            <th className="border p-3 text-gray-700 w-1/5 text-center">Name</th>
            <th className="border p-3 text-gray-700 w-1/5 text-center">Gender</th>
            <th className="border p-3 text-gray-700 w-1/5 text-center">Appointments</th>
            <th className="border p-3 text-gray-700 w-1/5 text-center">Edit</th>
        </tr>
    </thead>
    <tbody>
        {reviews.length > 0 ? (
            reviews.map((review) => (
                <tr key={review.id} className="border odd:bg-gray-100">
                    <td className="p-3 text-gray-700 text-center">{review.pid}</td>
                    <td className="p-3 text-gray-700 text-center">{review.name}</td>
                    <td className="p-3 text-gray-700 text-center">{review.gender}</td>
                    <td className="p-3 text-gray-700 text-center">{review.appointment_date}</td>
                    <td className="p-3 text-center">
                        <button className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 transition duration-300">
                            Edit
                        </button>
                    </td>
                </tr>
            ))
        ) : (
            <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">No reviews found</td>
            </tr>
        )}
    </tbody>
</table>

                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ReviewPeople;