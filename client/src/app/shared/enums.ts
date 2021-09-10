export enum InfrastructureType {
  BUILDING = 'BUILDING',
  FACTORY = 'FACTORY',
  WAREHOUSE = 'WAREHOUSE'
}

export enum FloorStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  DISABLED = 'DISABLED'
}

export enum InfrastructureTaskStatus {
  ESTIMATING = 'ESTIMATING',
  IN_PROGRESS = 'IN_PROGRESS',
  CANCELED = 'CANCELED',
  PAUSED = 'PAUSED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED'
}

export enum StationType {
  CHARGING = 'CHARGING',
  WORK = 'WORK'
}

export enum InfrastructureTaskType {
  GO_TO = 'GO_TO',
  CHARGE = 'CHARGE',
  CLEAN = 'CLEAN'
}

export enum InfrastructureStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
  ARCHIVED = 'ARCHIVED'
}
