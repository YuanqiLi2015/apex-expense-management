
export enum TransactionStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  SUBMITTED = 'SUBMITTED'
}

export interface Attachment {
  id: string;
  url: string;
  type: string;
  name: string;
}

export interface Expense {
  id: string;
  merchant: string;
  expenseName?: string;
  amount: number;
  date: string;
  time: string;
  category: string;
  icon: string;
  projectId?: string | null;
  status: TransactionStatus;
  logoUrl?: string;
  description?: string;
  error?: boolean;
  attachments?: Attachment[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  budget: number;
  createdDate: string;
  status: 'unsubmitted' | 'submitted';
}

export interface User {
  name: string;
  role: string;
  email: string;
  profilePic: string;
}