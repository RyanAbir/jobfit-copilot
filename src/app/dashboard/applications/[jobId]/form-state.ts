export type ApplicationStatusFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialApplicationStatusFormState: ApplicationStatusFormState = {
  status: "idle",
  message: "",
};
