import { Generated, ColumnType } from 'kysely';

export type RoleType = 'CLIENTE' | 'COLETOR';
export type RideStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'AT_CLIENT' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

export interface UsersTable {
  id: Generated<number>;
  phone: string;
  role: RoleType;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
  location_updated_at: ColumnType<Date, Date | string | undefined, Date | string>;
  is_available: Generated<boolean>;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface SessionsTable {
  id: string;
  user_id: number;
  expires_at: ColumnType<Date, Date | string, Date | string>;
  created_at: Generated<Date>;
}

export interface RidesTable {
  id: Generated<number>;
  client_id: number;
  collector_id: number;
  status: Generated<RideStatus>;

  origin_latitude: number;
  origin_longitude: number;
  origin_address: string | null;

  destination_address: string;
  destination_latitude: number | null;
  destination_longitude: number | null;

  requested_at: Generated<Date>;
  accepted_at: ColumnType<Date, Date | string | undefined, Date | string> | null;
  rejected_at: ColumnType<Date, Date | string | undefined, Date | string> | null;
  arrived_at_client_at: ColumnType<Date, Date | string | undefined, Date | string> | null;
  started_delivery_at: ColumnType<Date, Date | string | undefined, Date | string> | null;
  completed_at: ColumnType<Date, Date | string | undefined, Date | string> | null;
  cancelled_at: ColumnType<Date, Date | string | undefined, Date | string> | null;

  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export interface DB {
  users: UsersTable;
  sessions: SessionsTable;
  rides: RidesTable;
}