import { StyleSheet, Text, View } from 'react-native';

function PrototypeShell() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>GUKAK STUDIO</Text>
      <Text style={styles.subtitle}>12-string gayageum prototype shell</Text>
    </View>
  );
}

export default function Index() {
  return <PrototypeShell />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15120f',
    padding: 24,
  },
  title: {
    color: '#f7efe3',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#d6b26b',
    fontSize: 16,
  },
});
