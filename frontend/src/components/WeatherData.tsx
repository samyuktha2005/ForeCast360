import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

// Define a TypeScript interface for the weather data
interface WeatherDataType {
    id: string;
    temperature: number;
    condition: string;
}

const WeatherData: React.FC = () => {
    const [weatherData, setWeatherData] = useState<WeatherDataType[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const querySnapshot = await getDocs(collection(db, "weather_data"));
            const data = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as WeatherDataType), // Type assertion
            }));
            setWeatherData(data);
        };

        fetchData();
    }, []);

    return (
        <div className="p-4 bg-gray-100 rounded-lg">
            <h2 className="text-xl font-bold">Weather Data</h2>
            <ul>
                {weatherData.map((data) => (
                    <li key={data.id} className="p-2 border-b border-gray-300">
                        🌡 Temperature: {data.temperature}°C | 🌦 Condition: {data.condition}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WeatherData;
