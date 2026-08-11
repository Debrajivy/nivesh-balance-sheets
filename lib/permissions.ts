export type Role="operator"|"principal"|"ca"|"admin";
export type Capability="view_sheet"|"upload"|"review"|"refresh"|"edit_sheet"|"export"|"confirm"|"manual_item"|"alerts"|"view_tax"|"manage_tax"|"manage_firm"|"access_log";
export const permissions:Record<Role,ReadonlySet<Capability>>={operator:new Set(["view_sheet","upload","review","refresh","edit_sheet","export","confirm","manual_item","alerts","view_tax","manage_tax"]),principal:new Set(["view_sheet","confirm","manual_item","alerts","view_tax"]),ca:new Set(["view_sheet","view_tax","manage_tax"]),admin:new Set(["manage_firm","access_log"])};
export function hasCapability(role:string,capability:Capability){return Boolean(permissions[role as Role]?.has(capability))}
