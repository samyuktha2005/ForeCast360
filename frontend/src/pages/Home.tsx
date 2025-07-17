import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import for navigation
import { auth, googleProvider, githubProvider } from "../firebase/config";
import { signInWithPopup, signOut, User } from "firebase/auth";
import { 
  CloudSun, Compass, Shield, Mail, Github, MapPin, 
  Globe, BarChart3, ShieldCheck, Users, CloudRain, 
  Phone, Send 
} from "lucide-react";

import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { motion } from "framer-motion";

const WeatherVisionPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate(); // React Router navigation

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      setIsOpen(false);
    } catch (error: any) {
      alert(`Google Sign-In Error: ${error.message}`);
    }
  };

  const signInWithGitHub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      setUser(result.user);
      setIsOpen(false);
    } catch (error) {
      console.error("GitHub Sign-In Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate("/"); // Redirect to home page
    } catch (error: any) {
      alert(`Logout Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 text-white">
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full bg-blue-900/30 backdrop-blur-lg z-50 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-2">
            <CloudSun className="w-8 h-8 text-yellow-400" />
            <span className="text-2xl font-bold">WeatherVision</span>
          </div>
          <div className="flex gap-6 items-center">
            <a href="#about" className="hover:text-yellow-400 transition">About</a>
            <a href="#contact" className="hover:text-yellow-400 transition">Contact</a>
            {user ? (
              <button 
                onClick={handleLogout}
                className="px-5 py-2 bg-red-500 text-white rounded-full hover:bg-red-400 transition"
              >
                Log Out
              </button>
            ) : (
              <button 
                onClick={() => setIsOpen(true)}
                className="px-5 py-2 bg-green-500 text-white rounded-full hover:bg-green-400 transition"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-24 px-6 min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-8 leading-tight">
            Precision Weather Forecasting
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-12">
            Harnessing AI-powered predictive models for hyper-accurate weather forecasts anywhere on Earth.
          </p>

          <div className="flex justify-center gap-6">
            <button
              onClick={() => user ? navigate("/dashboard") : setIsOpen(true)}
              className="px-8 py-4 bg-yellow-400 text-blue-900 text-lg rounded-full hover:bg-yellow-300 transition-all flex items-center gap-2"
            >
              <Compass className="w-5 h-5" />
              Explore Forecast
            </button>
            <button 
              onClick={() => navigate("#about")}
              className="px-8 py-4 border-2 border-yellow-400 text-lg rounded-full hover:bg-yellow-400/10 transition-all flex items-center gap-2"
            >
              <Shield className="w-5 h-5" />
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Welcome to WeatherVision</h2>
            <div className="space-y-4">
              <button
                onClick={signInWithGoogle}
                className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded w-full hover:bg-gray-50 transition"
              >
                <FcGoogle className="text-xl" />
                Continue with Google
              </button>
              <button
                onClick={signInWithGitHub}
                className="flex items-center justify-center gap-2 bg-gray-800 text-white px-4 py-2 rounded w-full hover:bg-gray-700 transition"
              >
                <FaGithub className="text-xl" />
                Continue with GitHub
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}



      

      {/* About Section */}
      <section id="about">
      <div className="min-h-screen bg-white text-gray-900 py-24 px-6">
      <div className="max-w-6xl mx-auto text-center">
        {/* About Section Header */}
        <h2 className="text-5xl font-bold mb-6 text-blue-900">About WeatherVision</h2>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto">
          WeatherVision is an AI-driven weather forecasting platform designed to provide
          accurate, real-time weather predictions. Using cutting-edge technology, we analyze
          vast climate datasets to deliver actionable insights for businesses and individuals.
        </p>
      </div>

      {/* Mission & Vision */}
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <h3 className="text-3xl font-semibold text-blue-800 mb-4">Our Mission & Vision</h3>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto">
          Our mission is to enhance global weather forecasting accuracy using advanced AI and
          satellite data. We envision a world where weather predictions empower people to make
          informed decisions, improving safety and efficiency across various industries.
        </p>
      </div>

      {/* Key Features */}
      <div className="max-w-6xl mx-auto mt-12">
        <h3 className="text-3xl font-semibold text-blue-800 text-center mb-6">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 border rounded-lg shadow-lg">
            <Globe className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h4 className="text-xl font-semibold mb-2">Global Forecasting</h4>
            <p className="text-gray-600">
              Get real-time weather updates and predictions for any location worldwide.
            </p>
          </div>
          <div className="p-6 border rounded-lg shadow-lg">
            <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h4 className="text-xl font-semibold mb-2">AI-Powered Insights</h4>
            <p className="text-gray-600">
              Our deep learning models analyze climate trends for hyper-accurate predictions.
            </p>
          </div>
          <div className="p-6 border rounded-lg shadow-lg">
            <ShieldCheck className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h4 className="text-xl font-semibold mb-2">Reliable & Secure</h4>
            <p className="text-gray-600">
              We ensure data accuracy with state-of-the-art encryption and cloud security.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <h3 className="text-3xl font-semibold text-blue-800 mb-4">How It Works</h3>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto">
          WeatherVision collects meteorological data from satellites, radar, and ground stations.
          Our AI models process this data, generating forecasts that improve over time with machine learning.
        </p>
      </div>

      {/* Why Choose Us */}
      <div className="max-w-6xl mx-auto mt-12">
        <h3 className="text-3xl font-semibold text-blue-800 text-center mb-6">Why Choose WeatherVision?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
          <div className="p-6 border rounded-lg shadow-lg">
            <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h4 className="text-xl font-semibold mb-2">Trusted by Experts</h4>
            <p className="text-gray-600">
              Used by meteorologists, farmers, and businesses to plan ahead with confidence.
            </p>
          </div>
          <div className="p-6 border rounded-lg shadow-lg">
            <CloudRain className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h4 className="text-xl font-semibold mb-2">Real-Time Updates</h4>
            <p className="text-gray-600">
              Stay informed with instant alerts on severe weather conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
    </section>

      {/* Contact Section */}
      <section id="contact">
      <div className="min-h-screen bg-white text-gray-900 py-24 px-6">
      <div className="max-w-6xl mx-auto text-center">
        {/* Contact Page Header */}
        <h2 className="text-5xl font-bold mb-6 text-blue-900">Contact Us</h2>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto">
          Have questions or need assistance? Reach out to us, and our team will get back to you
          as soon as possible.
        </p>
      </div>

      {/* Contact Details */}
      <div className="max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="p-6 border rounded-lg shadow-lg">
          <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h4 className="text-xl font-semibold mb-2">Email Us</h4>
          <p className="text-gray-600">support@weathervision.com</p>
        </div>
        <div className="p-6 border rounded-lg shadow-lg">
          <Phone className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h4 className="text-xl font-semibold mb-2">Call Us</h4>
          <p className="text-gray-600">+1 (555) 123-4567</p>
        </div>
        <div className="p-6 border rounded-lg shadow-lg">
          <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h4 className="text-xl font-semibold mb-2">Visit Us</h4>
          <p className="text-gray-600">123 Weather St, Climate City, USA</p>
        </div>
      </div>

      {/* Contact Form */}
      <div className="max-w-4xl mx-auto mt-12 p-8 border rounded-lg shadow-lg">
        <h3 className="text-3xl font-semibold text-blue-800 text-center mb-6">Send Us a Message</h3>
        <form className="space-y-6">
          <div>
            <label className="block text-lg font-medium text-gray-700">Your Name</label>
            <input
              type="text"
              className="mt-2 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-700">Your Email</label>
            <input
              type="email"
              className="mt-2 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-lg font-medium text-gray-700">Your Message</label>
            <textarea
              className="mt-2 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows={5}
              placeholder="Type your message..."
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg text-lg font-semibold flex justify-center items-center gap-2 hover:bg-blue-700 transition duration-300"
          >
            <Send className="w-5 h-5" /> Send Message
          </button>
        </form>
      </div>
    </div>
    
    </section>

      {/* Login Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-white shadow-lg rounded-lg p-6 w-96"
          >
            <h2 className="text-2xl font-bold text-center mb-4">Login / Signup</h2>
            <button
              onClick={signInWithGoogle}
              className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded w-full mb-3 transition"
            >
              <FcGoogle className="mr-2 text-lg" /> Sign in with Google
            </button>
            <button
              onClick={signInWithGitHub}
              className="flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded w-full transition"
            >
              <FaGithub className="mr-2 text-lg" /> Sign in with GitHub
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded w-full transition"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WeatherVisionPage;
