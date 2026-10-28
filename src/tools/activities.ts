import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import type { Activity } from "../api/types.js";
import { successResult, errorResult, extraFields, type ToolResult } from "../api/types.js";

export const activityTools: Tool[] = [
  {
    name: "sc_list_activities",
    description:
      "List activities from SAP Sales Cloud V2. Supports filtering by processing type, lifecycle status, reported date range, and subject.",
    inputSchema: {
      type: "object",
      properties: {
        type_code: {
          type: "string",
          description: "Filter by processing type code (e.g. '0001' = Task, '0002' = Appointment, '0003' = Phone Call)",
        },
        status_code: {
          type: "string",
          description: "Filter by lifecycle status code (e.g. '1' = Open, '2' = In Process, '3' = Completed)",
        },
        subject_filter: {
          type: "string",
          description: "Filter by subject name (prefix match)",
        },
        date_from: {
          type: "string",
          description: "Filter by reported date >= this date (ISO 8601, e.g. 2025-01-01)",
        },
        date_to: {
          type: "string",
          description: "Filter by reported date <= this date (ISO 8601)",
        },
        top: { type: "number", description: "Max records to return (1–100, default 20)" },
        skip: { type: "number", description: "Records to skip for pagination" },
        select: { type: "string", description: "Comma-separated field names to return" },
        orderby: {
          type: "string",
          description: "Sort expression, e.g. 'ReportedDateTime desc'",
        },
      },
    },
  },
  {
    name: "sc_get_activity",
    description: "Retrieve a single activity by its ObjectID from SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the activity" },
        expand: {
          type: "string",
          description: "Comma-separated navigation properties to expand (e.g. 'ActivityParty,ActivityText')",
        },
      },
    },
  },
  {
    name: "sc_create_activity",
    description: "Create a new activity in SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["subject", "type_code"],
      properties: {
        subject: { type: "string", description: "Activity subject (required)" },
        type_code: {
          type: "string",
          description: "Processing type code (required): '0001' = Task, '0002' = Appointment, '0003' = Phone Call",
        },
        additional_fields: {
          type: "object",
          description: "Additional SAP field key-value pairs",
          additionalProperties: true,
        },
      },
    },
  },
  {
    name: "sc_update_activity",
    description: "Update an existing activity in SAP Sales Cloud V2 (e.g. mark as completed).",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the activity to update" },
        subject: { type: "string", description: "New subject" },
        status_code: {
          type: "string",
          description: "New lifecycle status code ('3' to mark complete)",
        },
        additional_fields: {
          type: "object",
          description: "Additional fields to patch",
          additionalProperties: true,
        },
      },
    },
  },
];

export async function handleActivityTool(
  toolName: string,
  args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "sc_list_activities": {
        const filters: string[] = [];
        if (args.type_code)
          filters.push(`ProcessingTypeCode eq '${args.type_code}'`);
        if (args.status_code)
          filters.push(`LifeCycleStatusCode eq '${args.status_code}'`);
        if (args.subject_filter)
          filters.push(`startswith(SubjectName,'${args.subject_filter}')`);
        if (args.date_from)
          filters.push(`ReportedDate ge datetime'${args.date_from}T00:00:00'`);
        if (args.date_to)
          filters.push(`ReportedDate le datetime'${args.date_to}T23:59:59'`);

        const result = await client.list<Activity>("ActivityCollection", {
          $filter: filters.length ? filters.join(" and ") : undefined,
          $top: Math.min(Number(args.top ?? 20), 100),
          $skip: args.skip ? Number(args.skip) : undefined,
          $select: args.select as string | undefined,
          $orderby: args.orderby as string | undefined,
          $count: true,
        });

        return successResult({
          total: result["@odata.count"],
          returned: result.value.length,
          activities: result.value,
        });
      }

      case "sc_get_activity": {
        const activity = await client.getById<Activity>(
          "ActivityCollection",
          args.object_id as string,
          { $expand: args.expand as string | undefined }
        );
        return successResult(activity);
      }

      case "sc_create_activity": {
        const body: Partial<Activity> = {
          SubjectName: args.subject as string,
          ProcessingTypeCode: args.type_code as string,
          ...extraFields(args),
        };
        const created = await client.create<Activity>("ActivityCollection", body);
        return successResult({ message: "Activity created", activity: created });
      }

      case "sc_update_activity": {
        const body: Partial<Activity> = {
          ...(args.subject ? { SubjectName: args.subject as string } : {}),
          ...(args.status_code ? { LifeCycleStatusCode: args.status_code as string } : {}),
          ...extraFields(args),
        };
        await client.patch<Activity>("ActivityCollection", args.object_id as string, body);
        return successResult({ message: "Activity updated", object_id: args.object_id });
      }

      default:
        return errorResult(`Unknown activity tool: ${toolName}`);
    }
  } catch (err) {
    return errorResult("Activity operation failed", err);
  }
}
