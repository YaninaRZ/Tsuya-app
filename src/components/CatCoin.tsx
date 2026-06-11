import { Image, ImageStyle } from "react-native";

export default function CatCoin({ size = 18, style }: { size?: number; style?: ImageStyle }) {
  return (
    <Image
      source={require("../../assets/images/money/cat-coin.png")}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
