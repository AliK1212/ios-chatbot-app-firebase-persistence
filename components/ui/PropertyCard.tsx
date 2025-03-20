import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { MapPin } from 'lucide-react-native';

type PropertyCardProps = {
  id: string;
  title: string;
  price: string;
  location: string;
  imageUrl: string;
};

export function PropertyCard({ id, title, price, location, imageUrl }: PropertyCardProps) {
  return (
    <Link href={("/properties/" + id) as any} asChild>
      <Pressable style={styles.container}>
        <Image source={{ uri: imageUrl }} style={styles.image} />
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.price}>{price}</Text>
          <View style={styles.location}>
            <MapPin size={16} color="#666" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#454545',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    color: '#ffa026',
    fontWeight: '600',
    marginBottom: 8,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
});