import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Filter } from 'lucide-react-native';

type FilterOption = {
  label: string;
  value: string;
};

// In PropertyFilters.tsx
type PropertyFiltersProps = {
  onFilterChange: (filters: Record<string, string[]>) => void;
};

const filterOptions: FilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Student HMO', value: 'student' },
  { label: 'Professional HMO', value: 'professional' },
  { label: 'High Yield', value: 'high-yield' },
  { label: 'New Listings', value: 'new' },
];

export function PropertyFilters({ onFilterChange }: PropertyFiltersProps) {
  const [activeFilters, setActiveFilters] = useState<string[]>(['all']);
  const [filtersVisible, setFiltersVisible] = useState(false);

  const toggleFilter = (value: string) => {
    let newFilters: string[];
    
    if (value === 'all') {
      newFilters = ['all'];
    } else {
      // Remove 'all' if it's present and another filter is selected
      const withoutAll = activeFilters.filter(f => f !== 'all');
      
      if (withoutAll.includes(value)) {
        // If this filter is already active, remove it
        newFilters = withoutAll.filter(f => f !== value);
        // If no filters left, set to 'all'
        if (newFilters.length === 0) newFilters = ['all'];
      } else {
        // Add this filter
        newFilters = [...withoutAll, value];
      }
    }
    
    setActiveFilters(newFilters);
    onFilterChange({ 'Property Type': newFilters });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setFiltersVisible(!filtersVisible)}
      >
        <Filter size={18} color="#333" />
        <Text style={styles.filterButtonText}>Filters</Text>
      </TouchableOpacity>
      
      {filtersVisible && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterOption,
                activeFilters.includes(option.value) && styles.activeFilterOption
              ]}
              onPress={() => toggleFilter(option.value)}
            >
              <Text 
                style={[
                  styles.filterOptionText,
                  activeFilters.includes(option.value) && styles.activeFilterOptionText
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  filtersScroll: {
    marginTop: 12,
  },
  filterOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterOption: {
    backgroundColor: '#ffa026',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterOptionText: {
    color: 'white',
    fontWeight: '500',
  },
});
