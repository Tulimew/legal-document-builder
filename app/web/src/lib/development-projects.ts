export type DevelopmentProject={key:string;projectId:string;reviewRoundId:string;draftVersionId:string;workspaceId:string;code:string;name:string;documentType:string;layout:"ARTICLE_PER_DOCUMENT"|"CHAPTER_PER_DOCUMENT";targetCount:number};

export const developmentProjects:DevelopmentProject[]=[
  {key:"thong-tu-mot-van-ban",projectId:"10000000-0000-4000-8000-000000000404",reviewRoundId:"10000000-0000-4000-8000-000000000413",draftVersionId:"10000000-0000-4000-8000-000000000411",workspaceId:"10000000-0000-4000-8000-000000000414",code:"HS-DEV-TT-02",name:"Thông tư sửa đổi một Thông tư",documentType:"Thông tư",layout:"ARTICLE_PER_DOCUMENT",targetCount:1},
  {key:"nghi-dinh-theo-dieu",projectId:"10000000-0000-4000-8000-000000000204",reviewRoundId:"10000000-0000-4000-8000-000000000213",draftVersionId:"10000000-0000-4000-8000-000000000211",workspaceId:"10000000-0000-4000-8000-000000000214",code:"HS-DEV-ND-01",name:"Nghị định sửa nhiều Nghị định — mỗi Điều sửa một Nghị định",documentType:"Nghị định",layout:"ARTICLE_PER_DOCUMENT",targetCount:3},
  {key:"nghi-dinh-theo-chuong",projectId:"10000000-0000-4000-8000-000000000304",reviewRoundId:"10000000-0000-4000-8000-000000000313",draftVersionId:"10000000-0000-4000-8000-000000000311",workspaceId:"10000000-0000-4000-8000-000000000314",code:"HS-DEV-ND-02",name:"Nghị định sửa nhiều Nghị định — mỗi Chương sửa một Nghị định",documentType:"Nghị định",layout:"CHAPTER_PER_DOCUMENT",targetCount:3},
];

export function developmentProject(key?:string){return developmentProjects.find(item=>item.key===key)??developmentProjects[0]}
export function developmentNodeId(project:DevelopmentProject,index:number){const projectNumber=Number(project.projectId.slice(-3,-2));return `20000000-0000-4000-8000-${String((projectNumber-1)*100+index).padStart(12,"0")}`}
