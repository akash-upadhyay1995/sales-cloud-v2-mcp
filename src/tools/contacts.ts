import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { SalesCloudClient } from "../api/client.js";
import type { Contact } from "../api/types.js";
import { successResult, errorResult, extraFields, type ToolResult } from "../api/types.js";

export const contactTools: Tool[] = [
  {
    name: "sc_list_contacts",
    description:
      "List contacts from SAP Sales Cloud V2. Supports filtering by name, account, status, and email.",
    inputSchema: {
      type: "object",
      properties: {
        account_id: {
          type: "string",
          description: "Filter by associated account ID",
        },
        first_name_filter: {
          type: "string",
          description: "Filter by first name (prefix match)",
        },
        last_name_filter: {
          type: "string",
          description: "Filter by last name (prefix match)",
        },
        email_filter: {
          type: "string",
          description: "Filter by email address (exact match)",
        },
        status_code: {
          type: "string",
          description: "Filter by status code (e.g. '1' = Active, '4' = Obsolete)",
        },
        top: { type: "number", description: "Max records to return (1–100, default 20)" },
        skip: { type: "number", description: "Records to skip for pagination" },
        select: { type: "string", description: "Comma-separated field names to return" },
        orderby: {
          type: "string",
          description: "Sort expression, e.g. 'LastName asc'",
        },
      },
    },
  },
  {
    name: "sc_get_contact",
    description: "Retrieve a single contact by their ObjectID from SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the contact" },
        expand: {
          type: "string",
          description: "Comma-separated navigation properties to expand",
        },
      },
    },
  },
  {
    name: "sc_create_contact",
    description: "Create a new contact in SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["last_name"],
      properties: {
        first_name: { type: "string", description: "First name" },
        last_name: { type: "string", description: "Last name (required)" },
        account_id: { type: "string", description: "Associated account ID" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Business phone number" },
        mobile: { type: "string", description: "Mobile phone number" },
        job_title: { type: "string", description: "Job title" },
        department_code: { type: "string", description: "Department code" },
        additional_fields: {
          type: "object",
          description: "Additional SAP field key-value pairs",
          additionalProperties: true,
        },
      },
    },
  },
  {
    name: "sc_update_contact",
    description: "Update an existing contact in SAP Sales Cloud V2.",
    inputSchema: {
      type: "object",
      required: ["object_id"],
      properties: {
        object_id: { type: "string", description: "ObjectID of the contact to update" },
        first_name: { type: "string", description: "New first name" },
        last_name: { type: "string", description: "New last name" },
        email: { type: "string", description: "New email address" },
        phone: { type: "string", description: "New business phone number" },
        mobile: { type: "string", description: "New mobile phone number" },
        job_title: { type: "string", description: "New job title" },
        department_code: { type: "string", description: "New department code" },
        account_id: { type: "string", description: "New associated account ID" },
        status_code: { type: "string", description: "New status code" },
        additional_fields: {
          type: "object",
          description: "Additional fields to patch",
          additionalProperties: true,
        },
      },
    },
  },
];

export async function handleContactTool(
  toolName: string,
  args: Record<string, unknown>,
  client: SalesCloudClient
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case "sc_list_contacts": {
        const filters: string[] = [];
        if (args.account_id)
          filters.push(`AccountID eq '${args.account_id}'`);
        if (args.first_name_filter)
          filters.push(`startswith(FirstName,'${args.first_name_filter}')`);
        if (args.last_name_filter)
          filters.push(`startswith(LastName,'${args.last_name_filter}')`);
        if (args.email_filter)
          filters.push(`Email eq '${args.email_filter}'`);
        if (args.status_code)
          filters.push(`StatusCode eq '${args.status_code}'`);

        const result = await client.list<Contact>("ContactCollection", {
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
          contacts: result.value,
        });
      }

      case "sc_get_contact": {
        const contact = await client.getById<Contact>(
          "ContactCollection",
          args.object_id as string,
          { $expand: args.expand as string | undefined }
        );
        return successResult(contact);
      }

      case "sc_create_contact": {
        const body: Partial<Contact> = {
          LastName: args.last_name as string,
          ...(args.first_name ? { FirstName: args.first_name as string } : {}),
          ...(args.account_id ? { AccountID: args.account_id as string } : {}),
          ...(args.email ? { Email: args.email as string } : {}),
          ...(args.phone ? { Phone: args.phone as string } : {}),
          ...(args.mobile ? { Mobile: args.mobile as string } : {}),
          ...(args.job_title ? { JobTitle: args.job_title as string } : {}),
          ...(args.department_code ? { DepartmentCode: args.department_code as string } : {}),
          ...extraFields(args),
        };
        const created = await client.create<Contact>("ContactCollection", body);
        return successResult({ message: "Contact created", contact: created });
      }

      case "sc_update_contact": {
        const body: Partial<Contact> = {
          ...(args.first_name ? { FirstName: args.first_name as string } : {}),
          ...(args.last_name ? { LastName: args.last_name as string } : {}),
          ...(args.email ? { Email: args.email as string } : {}),
          ...(args.phone ? { Phone: args.phone as string } : {}),
          ...(args.mobile ? { Mobile: args.mobile as string } : {}),
          ...(args.job_title ? { JobTitle: args.job_title as string } : {}),
          ...(args.department_code ? { DepartmentCode: args.department_code as string } : {}),
          ...(args.account_id ? { AccountID: args.account_id as string } : {}),
          ...(args.status_code ? { StatusCode: args.status_code as string } : {}),
          ...extraFields(args),
        };
        await client.patch<Contact>("ContactCollection", args.object_id as string, body);
        return successResult({ message: "Contact updated", object_id: args.object_id });
      }

      default:
        return errorResult(`Unknown contact tool: ${toolName}`);
    }
  } catch (err) {
    return errorResult("Contact operation failed", err);
  }
}
