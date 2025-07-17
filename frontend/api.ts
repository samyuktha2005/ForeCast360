import axios from "axios";
import { WeatherInput, WeatherResponse } from "./types";

const API_URL = "http://127.0.0.1:8000";

export const fetchPrediction = async (input: WeatherInput): Promise<WeatherResponse> => {
  const response = await axios.post(`${API_URL}/predict/`, input);
  return response.data;
};
