// Line 1: Main Feedback and Theme Controller
import React from 'react';
import { Toaster, toast } from 'react-hot-toast';

/**
 * @function FeedbackSystem
 * @description Provides the global Toaster container and theme mapping logic
 */
export const FeedbackSystem = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
        },
        success: {
          iconTheme: {
            primary: '#4ade80',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#f87171',
            secondary: '#fff',
          },
        },
      }}
    />
  );
};

/**
 * @function getWeatherTheme
 * @param {string} condition - The main weather condition from OpenWeather API
 * @returns {object} CSS styles for the dynamic glassmorphism glow
 */
export const getWeatherTheme = (condition) => {
  const themes = {
    Clear: {
      glow: '0 8px 32px 0 rgba(255, 223, 0, 0.35)', // Yellow Sun
      border: 'rgba(255, 223, 0, 0.2)',
      icon: 'light_mode'
    },
    Rain: {
      glow: '0 8px 32px 0 rgba(52, 152, 219, 0.35)', // Blue Rain
      border: 'rgba(52, 152, 219, 0.2)',
      icon: 'rainy'
    },
    Clouds: {
      glow: '0 8px 32px 0 rgba(149, 165, 166, 0.35)', // Grey Clouds
      border: 'rgba(149, 165, 166, 0.2)',
      icon: 'cloud'
    },
    Snow: {
      glow: '0 8px 32px 0 rgba(255, 255, 255, 0.4)', // White Snow
      border: 'rgba(255, 255, 255, 0.3)',
      icon: 'ac_unit'
    },
    Thunderstorm: {
      glow: '0 8px 32px 0 rgba(155, 89, 182, 0.35)', // Purple Lightning
      border: 'rgba(155, 89, 182, 0.2)',
      icon: 'thunderstorm'
    }
  };

  return themes[condition] || themes.Clear;
};

// Line 75: Exporting helper triggers
export const notifySuccess = (msg) => toast.success(msg);
export const notifyError = (msg) => toast.error(msg);