# Permissions

A School Admin receives the school permissions created in the first tenant migration, plus the module keys added later: `users.manage`, `roles.assign`, `classes.manage`, `timetables.manage`, `exams.manage`, `marks.submit`, `results.publish`, `attendance.mark`, `fees.configure`, `payments.record`, `complaints.resolve`, `documents.approve`, and `reports.export`.

Manager Admin has no permissions on the role. A School Admin grants module keys on that membership. `schools.create` cannot be granted. The manager can perform only those granted operations.

| Action                                   | Super Admin           | School Admin     | Manager Admin                      | Teacher               | Parent                                           |
| ---------------------------------------- | --------------------- | ---------------- | ---------------------------------- | --------------------- | ------------------------------------------------ |
| Create a school and its first admin      | Yes                   | No               | No                                 | No                    | No                                               |
| Change another school's name or branding | No                    | Own school       | No                                 | No                    | No                                               |
| Grant a manager a module                 | No                    | Yes              | No                                 | No                    | No                                               |
| Classes, subjects, published timetables  | No                    | Yes              | If granted                         | No                    | Read published rows for the linked child         |
| Submit marks                             | No                    | Yes              | If granted                         | Assigned section only | No                                               |
| Approve and publish results              | No                    | Yes              | If granted                         | No                    | Read published report cards for the linked child |
| Mark attendance                          | No                    | Yes              | If granted                         | Assigned section only | Read the linked child                            |
| Configure fees and issue invoices        | No                    | Yes              | If `fees.configure` is granted     | No                    | No                                               |
| Record cash or approve a refund          | No                    | Yes              | If `payments.record` is granted    | No                    | No                                               |
| Start a pending online payment           | No                    | No               | No                                 | No                    | Linked child only                                |
| Resolve a complaint                      | No                    | Yes              | If `complaints.resolve` is granted | No                    | Create and read own complaints                   |
| Approve a document                       | No                    | Yes              | If `documents.approve` is granted  | No                    | Create and read the linked child's requests      |
| Export a roster                          | Platform reports only | `reports.export` | If granted                         | No                    | No                                               |

The database policies are the control. Hidden navigation is not. A parent invoice payment becomes succeeded only inside `app.settle_gateway_payment` after the webhook signature and timestamp check, or when an authorized user records cash.
