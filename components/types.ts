export type Task = {
  taskId: string;
  taskName: string;
  completed: boolean;
  completedAt: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  taskWeight: number | null;
  order: number;
  SubArea?: {
    subAreaId: string;
    subAreaName: string;
    subAreaStatus?: string;
    Area?: {
      areaId: string;
      areaName: string;
      Tower?: {
        towerId: string;
        towerName: string;
        Project?: {
          projectId: string;
          projectName: string;
          projectStatus: string;
        };
      };
    };
  };
  Department?: { Id: string; name: string } | null;
  User?: { userId: string; firstName: string; lastName: string } | null;
};

export type ActiveFilter = "completed" | "pending" | "overdue" | "week" | "hold" | null;

export type SubAreaNode = { subAreaId: string; subAreaName: string; subAreaStatus: string };
export type AreaNode = { areaId: string; areaName: string; areaStatus: string; SubArea: SubAreaNode[] };
export type TowerNode = { towerId: string; towerName: string; towerStatus: string; Area: AreaNode[] };
export type ProjectNode = {
  projectId: string;
  projectName: string;
  projectStatus: string;
  Tower: TowerNode[];
};
