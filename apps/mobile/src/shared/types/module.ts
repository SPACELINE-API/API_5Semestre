export type ModuleAction = {
  label: string;
  description: string;
};

export type SprintModule = {
  title: string;
  eyebrow: string;
  description: string;
  route: string;
  backlogRefs: string[];
  actions: ModuleAction[];
};
