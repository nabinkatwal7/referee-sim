const Lights = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
    </>
  );
};

export default Lights;
