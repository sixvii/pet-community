import PawlyApp from "../components/PawlyApp";

export function meta() {
  return [
    { title: "pets, people, and care" },
    {
      name: "description",
      content: "A community for pet people and the care they share.",
    },
  ];
}

export default function HomeRoute() {
  return <PawlyApp />;
}
