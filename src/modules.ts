export interface Module {
  id:       string;
  icon:     string;
  titleKey: string;
  descKey:  string;
  path:     string;
  accent:   string;
  tagKeys:  string[];
}

export const MODULES: Module[] = [
  {
    id:       'vermogenplanner',
    icon:     '🏑',
    titleKey: 'wealthPlanner.title',
    descKey:  'wealthPlanner.cardDesc',
    path:     '/vermogenplanner',
    accent:   '#4ade80',
    tagKeys:  ['common.tags.finance', 'common.tags.planning'],
  },
];
