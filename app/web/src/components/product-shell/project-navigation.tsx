import Link from "next/link";
import { ProjectProgressBar } from "@/components/workflow/project-progress";
import { AccountMenu } from "./account-menu";
export function ProjectNavigation({projectId,active}:{projectId:string;active:string}){
 const groups=[
  {name:"Thực hiện",items:[["overview","Tổng quan",`/projects/${projectId}`],["drafting","Soạn thảo",`/projects/${projectId}/drafting`],["workflow","Quy trình",`/projects/${projectId}/workflow`],["review","Góp ý",`/projects/${projectId}/review`],["amendments","Văn bản sửa đổi",`/projects/${projectId}/amendments`]]},
  {name:"Phiên bản và kết quả",items:[["comparison","So sánh",`/projects/${projectId}/comparison`],["branches","Nhánh",`/projects/${projectId}/branches`],["publishing","Xuất bản",`/projects/${projectId}/publishing`],["operations","Tìm kiếm và hoạt động",`/projects/${projectId}/operations`],["ai","Trợ lý AI",`/projects/${projectId}/ai`]]},
 ];
 return <><nav aria-label="Chức năng hồ sơ" className="project-navigation border-b bg-white px-3 py-2 sm:px-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-5 overflow-x-auto">{groups.map(group=><section key={group.name} aria-label={group.name} className="shrink-0"><p className="px-2 text-[10px] font-bold uppercase text-slate-400">{group.name}</p><div className="mt-1 flex gap-1">{group.items.map(([key,label,href])=><Link aria-current={active===key?"page":undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${active===key?"bg-blue-700 text-white":"text-slate-700 hover:bg-slate-100"}`} href={href} key={key}>{label}</Link>)}</div></section>)}</div><AccountMenu/></div></nav><ProjectProgressBar projectId={projectId}/></>
}
