import {z} from 'zod';
const amount=z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v=>Number.isFinite(Number(v))&&Number(v)<=100000000,'Montan twò gwo');
const text=z.string().max(200),dictionary=<T extends z.ZodType>(value:T)=>z.record(z.string().max(500),value);
export const bankConfigurationSchema=z.object({
 items:z.array(z.object({id:text,name:text,bank:text.nullable(),resultMode:z.enum(['pick2','massachusetts4','dominican3','pending']).optional()})).max(300),
 removed:dictionary(z.boolean()),rates:dictionary(dictionary(amount)),
 closingTimes:dictionary(z.object({time:z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),zone:z.enum(['America/Santo_Domingo','America/New_York','America/Port-au-Prince','America/Chicago'])})).optional(),
 limits:z.array(z.object({lottery:text,bank:text,scope:text,game:text,number:text,days:z.array(amount).length(7)})).max(3000).optional(),
 posLayout:z.enum(['option1','option2','option3']).optional()
}).strict().refine(s=>new Set(s.items.map(i=>i.id)).size===s.items.length&&new Set(s.items.map(i=>i.name)).size===s.items.length,'Lotri an doub');
