import csv
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk


REQUIRED_COLUMNS = {
    "Last Name",
    "First Name",
    "Grade",
    "Group",
    "Email",
    "Parent/Guardian Email 1",
    "Parent/Guardian Email 2",
}


class WolfpackEmailHelper(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Wolfpack XC Email Helper")
        self.geometry("1040x720")
        self.minsize(820, 600)

        self.roster_path = None
        self.people = []
        self.selected_keys = set()

        self.grade_var = tk.StringVar(value="All grades")
        self.group_var = tk.StringVar(value="All groups")
        self.include_athletes = tk.BooleanVar(value=True)
        self.include_parents = tk.BooleanVar(value=False)
        self.file_label = tk.StringVar(value="No roster CSV selected")
        self.count_label = tk.StringVar(value="0 people selected · 0 email addresses")

        self._configure_style()
        self._build_ui()

    def _configure_style(self):
        style = ttk.Style(self)
        if "clam" in style.theme_names():
            style.theme_use("clam")
        style.configure("Title.TLabel", font=("Segoe UI", 22, "bold"), foreground="#651b32")
        style.configure("Heading.TLabel", font=("Segoe UI", 11, "bold"))
        style.configure("Accent.TButton", font=("Segoe UI", 10, "bold"))
        style.configure("Treeview", rowheight=30, font=("Segoe UI", 10))
        style.configure("Treeview.Heading", font=("Segoe UI", 10, "bold"))

    def _build_ui(self):
        outer = ttk.Frame(self, padding=20)
        outer.pack(fill="both", expand=True)

        ttk.Label(outer, text="Wolfpack XC Email Helper", style="Title.TLabel").pack(anchor="w")
        ttk.Label(
            outer,
            text="Load a roster CSV, filter the roster, select recipients, and copy the email list.",
        ).pack(anchor="w", pady=(2, 16))

        file_row = ttk.Frame(outer)
        file_row.pack(fill="x", pady=(0, 14))
        ttk.Button(file_row, text="Open roster CSV", command=self.open_roster).pack(side="left")
        ttk.Label(file_row, textvariable=self.file_label).pack(side="left", padx=12)

        controls = ttk.LabelFrame(outer, text="Filters and recipients", padding=12)
        controls.pack(fill="x", pady=(0, 12))

        ttk.Label(controls, text="Grade", style="Heading.TLabel").grid(row=0, column=0, sticky="w")
        self.grade_combo = ttk.Combobox(
            controls, textvariable=self.grade_var, state="readonly", values=["All grades"], width=18
        )
        self.grade_combo.grid(row=1, column=0, sticky="ew", padx=(0, 12), pady=(4, 0))

        ttk.Label(controls, text="Workout group", style="Heading.TLabel").grid(row=0, column=1, sticky="w")
        self.group_combo = ttk.Combobox(
            controls, textvariable=self.group_var, state="readonly", values=["All groups"], width=20
        )
        self.group_combo.grid(row=1, column=1, sticky="ew", padx=(0, 24), pady=(4, 0))

        ttk.Label(controls, text="Include", style="Heading.TLabel").grid(row=0, column=2, sticky="w")
        audience = ttk.Frame(controls)
        audience.grid(row=1, column=2, sticky="w", pady=(4, 0))
        ttk.Checkbutton(
            audience, text="Athletes", variable=self.include_athletes, command=self.update_output
        ).pack(side="left")
        ttk.Checkbutton(
            audience, text="Parents", variable=self.include_parents, command=self.update_output
        ).pack(side="left", padx=(12, 0))

        controls.columnconfigure(0, weight=1)
        controls.columnconfigure(1, weight=1)
        controls.columnconfigure(2, weight=2)
        self.grade_combo.bind("<<ComboboxSelected>>", lambda _event: self.refresh_tree())
        self.group_combo.bind("<<ComboboxSelected>>", lambda _event: self.refresh_tree())

        action_row = ttk.Frame(outer)
        action_row.pack(fill="x", pady=(0, 8))
        ttk.Button(action_row, text="Select visible", command=self.select_visible).pack(side="left")
        ttk.Button(action_row, text="Clear visible", command=self.clear_visible).pack(side="left", padx=8)
        ttk.Button(action_row, text="Clear all", command=self.clear_all).pack(side="left")
        ttk.Label(action_row, textvariable=self.count_label).pack(side="right")

        tree_frame = ttk.Frame(outer)
        tree_frame.pack(fill="both", expand=True)
        columns = ("selected", "name", "grade", "group")
        self.tree = ttk.Treeview(tree_frame, columns=columns, show="headings", selectmode="none")
        self.tree.heading("selected", text="Include")
        self.tree.heading("name", text="Name")
        self.tree.heading("grade", text="Grade")
        self.tree.heading("group", text="Workout Group")
        self.tree.column("selected", width=70, anchor="center", stretch=False)
        self.tree.column("name", width=300)
        self.tree.column("grade", width=90, anchor="center", stretch=False)
        self.tree.column("group", width=180)
        scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.tree.bind("<ButtonRelease-1>", self.toggle_person)

        output_frame = ttk.LabelFrame(outer, text="Comma-separated email list", padding=12)
        output_frame.pack(fill="x", pady=(14, 0))
        self.output = tk.Text(output_frame, height=4, wrap="word", font=("Consolas", 10))
        self.output.pack(fill="x")
        output_actions = ttk.Frame(output_frame)
        output_actions.pack(fill="x", pady=(10, 0))
        ttk.Button(
            output_actions, text="Copy email list", style="Accent.TButton", command=self.copy_output
        ).pack(side="right")

    def open_roster(self):
        path = filedialog.askopenfilename(
            title="Select XC Roster CSV",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
        )
        if not path:
            return

        try:
            with open(path, "r", encoding="utf-8-sig", newline="") as roster_file:
                reader = csv.DictReader(roster_file)
                headers = set(reader.fieldnames or [])
                missing = REQUIRED_COLUMNS - headers
                if missing:
                    raise ValueError("Missing columns: " + ", ".join(sorted(missing)))

                people = []
                for row_number, row in enumerate(reader, start=2):
                    first = (row.get("First Name") or "").strip()
                    last = (row.get("Last Name") or "").strip()
                    group = (row.get("Group") or "").strip()
                    if not first or not last or group.casefold() == "coach":
                        continue
                    people.append(
                        {
                            "key": f"{row_number}:{first}:{last}",
                            "name": f"{first} {last}",
                            "grade": (row.get("Grade") or "").strip(),
                            "group": group or "Unassigned",
                            "athlete_email": (row.get("Email") or "").strip(),
                            "parent_emails": [
                                email
                                for email in (
                                    (row.get("Parent/Guardian Email 1") or "").strip(),
                                    (row.get("Parent/Guardian Email 2") or "").strip(),
                                )
                                if email
                            ],
                        }
                    )

            if not people:
                raise ValueError("No athlete rows were found in the CSV.")

            self.roster_path = Path(path)
            self.people = people
            self.selected_keys.clear()
            self.file_label.set(f"{self.roster_path.name} · {len(people)} athletes")
            grades = sorted({person["grade"] for person in people if person["grade"]}, key=int)
            groups = sorted({person["group"] for person in people})
            self.grade_combo.configure(values=["All grades"] + [f"Grade {grade}" for grade in grades])
            self.group_combo.configure(values=["All groups"] + groups)
            self.grade_var.set("All grades")
            self.group_var.set("All groups")
            self.refresh_tree()
        except Exception as error:
            messagebox.showerror("Could not open roster", str(error))

    def visible_people(self):
        grade_label = self.grade_var.get()
        selected_grade = grade_label[6:] if grade_label.startswith("Grade ") else grade_label
        selected_group = self.group_var.get()
        return [
            person
            for person in self.people
            if (selected_grade == "All grades" or person["grade"] == selected_grade)
            and (selected_group == "All groups" or person["group"] == selected_group)
        ]

    def refresh_tree(self):
        self.tree.delete(*self.tree.get_children())
        for person in self.visible_people():
            checked = "☑" if person["key"] in self.selected_keys else "☐"
            self.tree.insert(
                "", "end", iid=person["key"], values=(checked, person["name"], person["grade"], person["group"])
            )
        self.update_output()

    def toggle_person(self, event):
        item_id = self.tree.identify_row(event.y)
        if not item_id:
            return
        if item_id in self.selected_keys:
            self.selected_keys.remove(item_id)
        else:
            self.selected_keys.add(item_id)
        self.refresh_tree()

    def select_visible(self):
        self.selected_keys.update(person["key"] for person in self.visible_people())
        self.refresh_tree()

    def clear_visible(self):
        self.selected_keys.difference_update(person["key"] for person in self.visible_people())
        self.refresh_tree()

    def clear_all(self):
        self.selected_keys.clear()
        self.refresh_tree()

    def selected_emails(self):
        emails = []
        for person in self.people:
            if person["key"] not in self.selected_keys:
                continue
            if self.include_athletes.get() and person["athlete_email"]:
                emails.append(person["athlete_email"])
            if self.include_parents.get():
                emails.extend(person["parent_emails"])

        unique = []
        seen = set()
        for email in emails:
            normalized = email.casefold()
            if normalized not in seen:
                seen.add(normalized)
                unique.append(email)
        return unique

    def update_output(self):
        emails = self.selected_emails()
        self.output.delete("1.0", "end")
        self.output.insert("1.0", ", ".join(emails))
        self.count_label.set(
            f"{len(self.selected_keys)} people selected · {len(emails)} email address{'es' if len(emails) != 1 else ''}"
        )

    def copy_output(self):
        emails = self.selected_emails()
        if not emails:
            messagebox.showinfo("Nothing to copy", "Select at least one person and email audience.")
            return
        text = ", ".join(emails)
        self.clipboard_clear()
        self.clipboard_append(text)
        self.update()
        messagebox.showinfo("Copied", f"Copied {len(emails)} email addresses to the clipboard.")


if __name__ == "__main__":
    WolfpackEmailHelper().mainloop()
