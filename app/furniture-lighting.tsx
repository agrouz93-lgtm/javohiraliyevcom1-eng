"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
export function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl),
      room = new RoomEnvironment();
    const target = generator.fromScene(room, 0.04);
    const previous = scene.environment,
      previousIntensity = scene.environmentIntensity;
    scene.environment = target.texture;
    scene.environmentIntensity = 0.65;
    room.dispose();
    generator.dispose();
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      target.dispose();
    };
  }, [gl, scene]);
  return null;
}
