import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TouchableOpacity,
} from "react-native";
import { Gyroscope } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

const { width, height } = Dimensions.get("window");
const BALL_SIZE = 40;
const ORB_SIZE = 30;

// ============================================================
// ATUALIZAÇÃO: Adicionado 'target' (meta de pontos) para cada nível
// ============================================================
const LEVELS = {
  facil: { speed: 8, decay: 0.15, bonus: 15, label: "Fácil", target: 10 },
  medio: { speed: 12, decay: 0.3, bonus: 10, label: "Médio", target: 15 },
  dificil: { speed: 18, decay: 0.5, bonus: 7, label: "Difícil", target: 20 },
  insano: { speed: 25, decay: 0.8, bonus: 4, label: "Insano", target: 30 },
};

export default function OrbeFlutuante() {
  const [gameState, setGameState] = useState("start"); // 'start', 'playing', 'gameover', 'victory'
  const [difficulty, setDifficulty] = useState(LEVELS.medio);
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });
  const [orbPosition, setOrbPosition] = useState({
    x: Math.random() * (width - ORB_SIZE),
    y: Math.random() * (height - ORB_SIZE),
  });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(100);

  // Função para sons
  async function playSound(type) {
    try {
      const soundFiles = {
        collect: require("./assets/collect.mp3"),
        fail: require("./assets/gameover.mp3"),
        victory: require("./assets/victory.mp3"), // Certifique-se de ter esse arquivo
      };
      const { sound } = await Audio.Sound.createAsync(soundFiles[type]);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (e) {
      /* Arquivo não encontrado */
    }
  }

  const startGame = (selectedLevel) => {
    setDifficulty(selectedLevel);
    setScore(0);
    setTimeLeft(100);
    setPosition({ x: width / 2, y: height / 2 });
    setGameState("playing");
  };

  // Sensor
  useEffect(() => {
    Gyroscope.setUpdateInterval(16);
    const subscription = Gyroscope.addListener((gyroData) => {
      if (gameState === "playing") setData(gyroData);
    });
    return () => subscription.remove();
  }, [gameState]);

  // Movimento
  useEffect(() => {
    if (gameState !== "playing") return;

    let newX = position.x - data.y * difficulty.speed;
    let newY = position.y - data.x * difficulty.speed;

    if (newX < 0) newX = 0;
    if (newX > width - BALL_SIZE) newX = width - BALL_SIZE;
    if (newY < 0) newY = 0;
    if (newY > height - BALL_SIZE) newY = height - BALL_SIZE;

    setPosition({ x: newX, y: newY });
  }, [data]);

  // Timer e Vibração
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      if (timeLeft > 0) {
        setTimeLeft(timeLeft - difficulty.decay);
        if (timeLeft < 20)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        setGameState("gameover");
        playSound("fail");
      }
    }, 100);
    return () => clearInterval(timer);
  }, [timeLeft, gameState, difficulty]);

  // Colisão e Meta de Pontos
  useEffect(() => {
    if (gameState !== "playing") return;

    const dx = position.x + BALL_SIZE / 2 - (orbPosition.x + ORB_SIZE / 2);
    const dy = position.y + BALL_SIZE / 2 - (orbPosition.y + ORB_SIZE / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < BALL_SIZE / 2 + ORB_SIZE / 2) {
      const nextScore = score + 1;
      setScore(nextScore);

      // ============================================================
      // ATUALIZAÇÃO: Checagem de Vitória
      // ============================================================
      if (nextScore >= difficulty.target) {
        setGameState("victory");
        playSound("victory");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        playSound("collect");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setOrbPosition({
          x: Math.random() * (width - ORB_SIZE),
          y: Math.random() * (height - ORB_SIZE),
        });
        let bonusTime = timeLeft + difficulty.bonus;
        setTimeLeft(bonusTime > 100 ? 100 : bonusTime);
      }
    }
  }, [position]);

  // Componentes de Tela
  const StartScreen = () => (
    <View style={styles.fullScreen}>
      <Text style={styles.title}>ORBE FLUTUANTE</Text>
      <Text style={styles.subtitle}>Escolha a dificuldade:</Text>
      {Object.values(LEVELS).map((lvl) => (
        <TouchableOpacity
          key={lvl.label}
          style={styles.levelButton}
          onPress={() => startGame(lvl)}
        >
          <Text style={styles.buttonText}>
            {lvl.label} (Meta: {lvl.target})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const GameOverScreen = () => (
    <View style={styles.fullScreen}>
      <Text style={[styles.title, { color: "#FF4757" }]}>FIM DE JOGO!</Text>
      <Text style={styles.finalScoreText}>Você fez {score} pontos.</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setGameState("start")}
      >
        <Text style={styles.buttonText}>TENTAR NOVAMENTE</Text>
      </TouchableOpacity>
    </View>
  );

  // ============================================================
  // ATUALIZAÇÃO: Nova Tela de Vitória
  // ============================================================
  const VictoryScreen = () => (
    <View style={styles.fullScreen}>
      <Text style={[styles.title, { color: "#4cd137" }]}>VITÓRIA!</Text>
      <Text style={styles.finalScoreText}>
        Meta de {difficulty.target} atingida!
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#4cd137" }]}
        onPress={() => setGameState("start")}
      >
        <Text style={styles.buttonText}>PRÓXIMO NÍVEL</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {gameState === "start" && <StartScreen />}
      {gameState === "gameover" && <GameOverScreen />}
      {gameState === "victory" && <VictoryScreen />}

      {gameState === "playing" && (
        <>
          {/* ============================================================
              ATUALIZAÇÃO: Botão Sair no canto superior ESQUERDO
          ============================================================ */}
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => setGameState("start")}
          >
            <Text style={styles.exitButtonText}>Sair</Text>
          </TouchableOpacity>

          <View style={styles.uiContainer}>
            <Text style={styles.scoreText}>
              Pontos: {score} / {difficulty.target}
            </Text>
            <View style={styles.timerBackground}>
              <View
                style={[
                  styles.timerFill,
                  {
                    width: `${timeLeft}%`,
                    backgroundColor: timeLeft < 20 ? "#FF4757" : "#4cd137",
                  },
                ]}
              />
            </View>
          </View>

          <View
            style={[styles.orb, { left: orbPosition.x, top: orbPosition.y }]}
          />
          <View style={[styles.ball, { left: position.x, top: position.y }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#00015E",
    width: "100%",
  },
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#00015E",
  },
  title: {
    fontSize: 38,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#bdc3c7",
    marginBottom: 20,
  },
  levelButton: {
    backgroundColor: "coral",
    paddingVertical: 12,
    borderRadius: 25,
    width: 250,
    alignItems: "center",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2e86de",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  finalScoreText: {
    fontSize: 24,
    color: "#FFF",
    marginBottom: 30,
  },
  uiContainer: {
    marginTop: 60,
    alignItems: "center",
    width: "100%",
  },
  scoreText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  timerBackground: {
    width: "80%",
    height: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    overflow: "hidden",
  },
  timerFill: {
    height: "100%",
  },
  ball: {
    position: "absolute",
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: "coral",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  orb: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: "#00D2FF",
    borderWidth: 2,
    borderColor: "#FFF",
  },

  // Botão Sair à Esquerda
  exitButton: {
    position: "absolute",
    top: 50,
    left: 20, // Mudado de right para left
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    zIndex: 10,
  },
  exitButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});
