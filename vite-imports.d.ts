// Type declarations for Vite-style ?url imports used in playground
declare module '*.fbx?url' {
  const value: string;
  export default value;
}

declare module '*.glb?url' {
  const value: string;
  export default value;
}

declare module '*.gltf?url' {
  const value: string;
  export default value;
}
