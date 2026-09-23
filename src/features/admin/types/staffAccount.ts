export type StaffRole = "HR" | "ACCOUNTS" | "IT";

export interface StaffAccount {
  id: string;
  cognitoSub: string;
  role: StaffRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdById: string;
  createdAt: string;
}
