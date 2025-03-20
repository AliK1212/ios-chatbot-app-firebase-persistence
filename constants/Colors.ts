export const Colors = {
  primary: '#FF9800',       // Modern orange as primary color
  secondary: '#FFA026',     // Orange accent
  success: '#00B67A',       // Green for reviews
  background: '#f8f8f8',    // Light grey background
  white: '#FFFFFF',
  black: '#212121',         // Rich black for emphasis
  brand: '#ffa000',         // SafeHMO orange
  gray: {
    light: '#F5F5F5',       // Very light grey
    medium: '#E0E0E0',      // Medium grey for borders
    dark: '#757575'         // Dark grey for secondary text
  },
  text: {
    primary: '#212121',     // Near black for primary text
    secondary: '#757575',   // Dark grey for secondary text
    light: '#9E9E9E'        // Light grey for tertiary text
  },
  border: '#E0E0E0',        // Medium grey for borders
  error: '#FF5252',         // Bright red for errors
  // Add opacity variants for overlays and disabled states
  primaryWithOpacity: (opacity: number) => `rgba(255, 152, 0, ${opacity})`,
  secondaryWithOpacity: (opacity: number) => `rgba(255, 160, 38, ${opacity})`,
  brandWithOpacity: (opacity: number) => `rgba(255, 160, 0, ${opacity})`,
  successWithOpacity: (opacity: number) => `rgba(0, 182, 122, ${opacity})`,
  errorWithOpacity: (opacity: number) => `rgba(255, 82, 82, ${opacity})`,
  blackWithOpacity: (opacity: number) => `rgba(33, 33, 33, ${opacity})`,
  whiteWithOpacity: (opacity: number) => `rgba(255, 255, 255, ${opacity})`
};

export default Colors;
