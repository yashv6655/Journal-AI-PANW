import { PromptsTab } from '@/components/dashboard/PromptsTab';

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Prompts & Topics</h1>
        <p className="text-xl text-muted-foreground">
          Discover personalized prompts based on your journaling journey
        </p>
      </div>
      <PromptsTab />
    </div>
  );
}
