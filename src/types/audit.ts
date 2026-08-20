export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  module:
    | "employee"
    | "kpi_template"
    | "ranking"
    | "permission"
    | "period"
    | "system"
    | "kpi_record";
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}