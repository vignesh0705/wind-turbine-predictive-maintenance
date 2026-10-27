export const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const RISK_CATEGORIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

export const RISK_CATEGORY_COLORS = {
  LOW: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
    hex: '#16A34A',
  },
  MEDIUM: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
    hex: '#F59E0B',
  },
  HIGH: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    dot: 'bg-orange-500',
    hex: '#EA580C',
  },
  CRITICAL: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-600',
    hex: '#DC2626',
  },
};

export const FARMS = {
  A: 'Wind Farm A',
  B: 'Wind Farm B',
};

export const COMPONENT_NAMES = {
  gearbox: 'Gearbox Assembly',
  generator: 'Generator Subsystem',
  hydraulic: 'Hydraulic Pitch/Yaw',
  transformer: 'Main Transformer',
  electrical_grid: 'Electrical Grid Interface',
  rotor_mechanical: 'Rotor & Mechanical',
  rotor_bearing: 'Main Rotor Bearing',
  vibration_mechanical: 'Drivetrain Vibration',
  overall_system: 'Overall Turbine System',
};
