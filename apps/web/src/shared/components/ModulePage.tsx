import type { SprintModule } from "../types/module";

type ModulePageProps = {
  module: SprintModule;
};

export function ModulePage({ module }: ModulePageProps) {
  return (
    <section className="module-page">
      <span className="eyebrow">{module.eyebrow}</span>
      <h1>{module.title}</h1>
      <p>{module.description}</p>

      <div className="reference-list" aria-label="Referencias do backlog">
        {module.backlogRefs.map((ref) => (
          <span key={ref}>{ref}</span>
        ))}
      </div>

      <div className="action-grid">
        {module.actions.map((action) => (
          <article className="action-card" key={action.label}>
            <h2>{action.label}</h2>
            <p>{action.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
