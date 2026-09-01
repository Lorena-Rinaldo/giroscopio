import { StyleSheet, View } from "react-native";
import LeituraGiroscopio from "@/components/LeituraGiroscopio";
import OrbeFlutuante from "@/components/OrbeFlutuante"

export default function Index() {
  return (
    <View style={styles.container}>
      {/* <LeituraGiroscopio /> */}
      <OrbeFlutuante />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
