import { useMutation } from '@tanstack/react-query';
import { createReport, CreateReportInput } from '../api/reportsApi';

export const useCreateReport = () => {
  return useMutation({
    mutationFn: (input: CreateReportInput) => createReport(input),
  });
};
