import React, { useState, useEffect } from 'react';
import { 
  Cloud, Sun, Droplets, Wind, Search, MapPin, 
  ThermometerSun, Clock, CloudRain, Sunrise, Sunset,
  Map, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Map click handler component
function MapClickHandler({ onClick }: { onClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '50456d9cbe96a42a89f6b83a12f15202';

function Dashboard() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('Loading...');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sunrise, setSunrise] = useState("--:-- --");
  const [sunset, setSunset] = useState("--:-- --");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [weatherData, setWeatherData] = useState({
    temperature: null as number | null,
    condition: 'Loading...',
    details: {
      humidity: null as number | null,
      windSpeed: null as number | null,
      pressure: null as number | null,
      windDeg: null as number | null,
      cloudiness: null as number | null,
      precipitation: null as number | null
    }
  });
  const [hourlyForecast, setHourlyForecast] = useState<Array<{
    time: string;
    temp: number;
    icon: any;
  }>>([]);
  const [prediction, setPrediction] = useState<{
    temp: number | null;
    condition: string | null;
    confidence: number | null;
  }>({ temp: null, condition: null, confidence: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 77]);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  // Update current time and date
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(format(now, 'h:mm a'));
      setCurrentDate(format(now, 'MMMM d, yyyy'));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchPrediction = async (latitude: number, longitude: number) => {
    try {
      setIsPredicting(true);
      setPredictionError(null);
      
      // Get current weather data
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );
      const currentWeather = await weatherResponse.json();
  
      // Create historical data sequence (mock data using current weather)
      const now = new Date();
      const weatherSequence = Array(144).fill(0).map((_, i) => ({
        "Date_Time": new Date(now.getTime() - (143 - i) * 10 * 60 * 1000).toISOString(),
        "p (mbar)": currentWeather.main.pressure,
        "T (degC)": currentWeather.main.temp,
        "rh (%)": currentWeather.main.humidity,
        "wv (m/s)": currentWeather.wind.speed,
        // These can be null as they'll be calculated by the backend
        "Tdew (degC)": null,
        "VPmax (mbar)": null,
        "VPact (mbar)": null,
        "VPdef (mbar)": null
      }));
  
      const response = await fetch("http://127.0.0.1:8000/predict/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          weather_data: weatherSequence  // Match backend's expected field name
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      setPrediction({
        temp: result.predicted_temperature,
        confidence: result.confidence,
        condition: currentWeather.weather[0]?.main || null
      });
    } catch (err) {
      console.error("Prediction fetch error:", err);
      setPredictionError("AI prediction unavailable");
      setPrediction({ 
        temp: null, 
        confidence: null,
        condition: null 
      });
    } finally {
      setIsPredicting(false);
    }
  };

  // Fetch initial location and weather data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLon(longitude);
          setMapCenter([latitude, longitude]);
          await fetchLocation(latitude, longitude);
          await fetchAllWeatherData(latitude, longitude);
        } else {
          setLocation("Geolocation Not Supported");
          // Default to a major city if geolocation not available
          await fetchAllWeatherData(38.9072, -77.0369); // Washington DC
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Initialization error");
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const fetchAllWeatherData = async (latitude: number, longitude: number) => {
    try {
      await Promise.all([
        fetchWeather(latitude, longitude),
        fetchSunTimes(latitude, longitude),
        fetchHourlyForecast(latitude, longitude)
      ]);
      await fetchPrediction(latitude, longitude);
    } catch (err) {
      console.error("Error fetching all weather data:", err);
    }
  };

  const fetchLocation = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      const data = await response.json();
      
      const locationName =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.county ||
        data.address.state ||
        "Unknown Location";
      
      setLocation(locationName);
      setSelectedLocation({
        latitude,
        longitude,
        name: locationName
      });
    } catch (err) {
      console.error("Location fetch error:", err);
      setLocation("Location Unavailable");
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );
      const data = await response.json();
      
      setWeatherData({
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        details: {
          humidity: data.main.humidity,
          windSpeed: data.wind.speed,
          pressure: data.main.pressure,
          windDeg: data.wind.deg,
          cloudiness: data.clouds?.all || 0,
          precipitation: data.rain ? data.rain["1h"] || 0 : 0
        }
      });
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError("Failed to load weather data");
    }
  };

  const fetchSunTimes = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`
      );
      const data = await response.json();
      
      if (data.status === "OK") {
        const sunriseTime = new Date(data.results.sunrise);
        const sunsetTime = new Date(data.results.sunset);
        
        setSunrise(format(sunriseTime, "h:mm a"));
        setSunset(format(sunsetTime, "h:mm a"));
      }
    } catch (err) {
      console.error("Sun times fetch error:", err);
    }
  };

  const fetchHourlyForecast = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&cnt=6`
      );
      const data = await response.json();
      
      const forecast = data.list.map((item: any) => ({
        time: format(new Date(item.dt * 1000), 'h a'),
        temp: Math.round(item.main.temp),
        icon: getWeatherIcon(item.weather[0].main)
      }));
      
      setHourlyForecast(forecast);
    } catch (err) {
      console.error("Forecast fetch error:", err);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return Sun;
      case 'rain':
        return CloudRain;
      case 'clouds':
        return Cloud;
      case 'thunderstorm':
        return CloudRain;
      default:
        return Cloud;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const results = await response.json();
      
      if (results.length > 0) {
        const { lat, lon, display_name } = results[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        setLat(latitude);
        setLon(longitude);
        setMapCenter([latitude, longitude]);
        setLocation(display_name);
        await fetchAllWeatherData(latitude, longitude);
      } else {
        setError("Location not found");
      }
    } catch (err) {
      setError("Search failed");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
      setError("Logout failed");
    }
  };

  const handleMapClick = async (latlng: L.LatLng) => {
    const latitude = latlng.lat;
    const longitude = latlng.lng;
    
    setLat(latitude);
    setLon(longitude);
    setMapCenter([latitude, longitude]);
    
    try {
      setLoading(true);
      await fetchLocation(latitude, longitude);
      await fetchAllWeatherData(latitude, longitude);
    } catch (err) {
      setError("Failed to update location");
      console.error("Map click error:", err);
    } finally {
      setLoading(false);
      setShowMap(false);
    }
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-2xl">Loading weather data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen weather-bg">
      <div className="min-h-screen bg-gradient-to-br from-gray-900/90 to-gray-900/70 backdrop-blur-sm p-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar */}
          <div className="mb-8 flex gap-4">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location..."
                className="w-full px-6 py-4 bg-white/10 rounded-2xl text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-white/25 transition-all duration-300"
              />
              <button type="submit" className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <Search className="text-white/50 hover:text-white transition" size={24} />
              </button>
            </form>
            <button 
              onClick={toggleMap}
              className="flex items-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-colors"
            >
              <Map size={20} />
              <span>Select on Map</span>
            </button>
          </div>

          {/* Map Modal */}
          {showMap && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
              <div className="bg-gray-900 rounded-xl w-full max-w-6xl h-[80vh] relative">
                <button 
                  onClick={toggleMap}
                  className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full"
                >
                  ✕
                </button>
                
                <MapContainer 
                  center={mapCenter} 
                  zoom={5} 
                  style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapClickHandler onClick={handleMapClick} />
                  {selectedLocation && (
                    <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
                      <Popup>{selectedLocation.name}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>
          )}

          {/* Main Weather Card */}
          <div className="glass-card rounded-3xl p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Panel - Current Weather */}
              <div className="md:col-span-4 md:border-r border-white/10">
                <div className="animate-float">
                  {React.createElement(getWeatherIcon(weatherData.condition), {
                    className: "text-blue-400 w-24 h-24 mb-6"
                  })}
                </div>
                <div className="mb-8">
                  <div className="flex items-start">
                    <span className="text-8xl font-light text-white">
                      {weatherData.temperature || '--'}°
                    </span>
                    <span className="text-2xl text-white/60 mt-4">C</span>
                  </div>
                  <h2 className="text-3xl font-light text-white/80 mt-4">
                    {weatherData.condition}
                  </h2>
                  {isPredicting ? (
                    <div className="mt-4 bg-blue-900/20 rounded-xl p-4 border border-blue-400/30 flex items-center gap-2">
                      <Loader2 className="animate-spin text-blue-300" size={20} />
                      <div className="text-blue-300">AI is predicting weather...</div>
                    </div>
                  ) : predictionError ? (
                    <div className="mt-4 bg-red-900/20 rounded-xl p-4 border border-red-400/30">
                      <div className="text-red-300">{predictionError}</div>
                    </div>
                  ) : prediction.temp !== null ? (
                    <div className="mt-4 bg-blue-900/30 rounded-xl p-4 border border-blue-400/30">
                      <div className="text-blue-300 text-lg font-medium">AI Prediction</div>
                      <div className="text-2xl text-white mt-1">
                        {prediction.temp.toFixed(1)}°C in 1 hour
                      </div>
                      {prediction.condition && (
                        <div className="text-blue-200 text-sm mt-1">
                          Expected: {prediction.condition}
                        </div>
                      )}
                      {prediction.confidence && (
                        <div className="text-blue-200 text-sm mt-1">
                          Confidence: {(prediction.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 text-white/60 cursor-pointer">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${location}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4"
                    >
                      <MapPin size={20} className="hover:text-white transition duration-300" />
                      <span>{location}</span>
                    </a>
                  </div>
                  <div className="flex items-center gap-4 text-white/60">
                    <Clock size={20} />
                    <span>{currentTime}, {currentDate}</span>
                  </div>
                </div>
              </div>

              {/* Right Panel - Details */}
              <div className="md:col-span-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Sun Times */}
                  <div className="glass-card rounded-2xl p-6 space-y-4">
                    <h3 className="text-white/80 font-medium">Sunrise & Sunset</h3>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Sunrise className="text-orange-400" size={24} />
                        <div>
                          <p className="text-white text-lg">{sunrise}</p>
                          <p className="text-white/60 text-sm">Sunrise</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sunset className="text-purple-400" size={24} />
                        <div>
                          <p className="text-white text-lg">{sunset}</p>
                          <p className="text-white/60 text-sm">Sunset</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weather Details */}
                  <div className="glass-card rounded-2xl p-6 space-y-4">
                    <h3 className="text-white/80 font-medium">Air Conditions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Droplets className="text-blue-400" size={24} />
                        <div>
                          <p className="text-white text-lg">{weatherData.details.humidity || '--'}%</p>
                          <p className="text-white/60 text-sm">Humidity</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Wind className="text-blue-400" size={24} />
                        <div>
                          <p className="text-white text-lg">{weatherData.details.windSpeed || '--'} km/h</p>
                          <p className="text-white/60 text-sm">Wind Speed</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hourly Forecast */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-white/80 font-medium mb-6">Today's Forecast</h3>
                  <div className="relative">
                    <div className="temp-line"></div>
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-4">
                      {hourlyForecast.map((hour, index) => (
                        <div key={index} className="relative text-center group transition-transform hover:scale-105">
                          <div className="text-2xl font-light text-white mb-4">{hour.temp}°</div>
                          {React.createElement(hour.icon, {
                            className: `mx-auto mb-4 ${index === 0 ? 'text-yellow-400' : 'text-white/60'}`,
                            size: 24
                          })}
                          <div className="text-sm text-white/60">{hour.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Logout Button */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;