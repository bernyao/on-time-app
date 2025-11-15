import { useContext } from "react";
import { RemindersContext } from "../context/RemindersContext";

export default function useReminders() {
  return useContext(RemindersContext);
}
