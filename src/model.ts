export type Category = '快递代取' | '食堂代买' | '打印取送' | '生活互助';
export type Status = 'open' | 'active' | 'delivered' | 'completed' | 'cancelled';
export type Profile = {
  id: string;
  name: string;
  avatar: string;
  department: string;
  baseCredit: number;
  color: string;
};
export type Task = {
  id: string;
  title: string;
  category: Category;
  from: string;
  to: string;
  region: string;
  reward: number;
  deadline: number;
  description: string;
  ownerId: string;
  runnerId?: string;
  status: Status;
  createdAt: number;
  deliveredAt?: number;
  completedAt?: number;
  rating?: number;
  review?: string;
  weight: string;
  contactNote: string;
};
export type CreditEntry = {
  id: string;
  userId: string;
  taskId: string;
  reason: string;
  points: number;
  at: number;
};
export type AppState = {
  version: 1;
  currentUserId: string;
  tasks: Task[];
  ledger: CreditEntry[];
};

export const profiles: Profile[] = [
  { id: 'lin', name: '林同学', avatar: '林', department: '计算机学院', baseCredit: 92, color: '#527a63' },
  { id: 'zhou', name: '周同学', avatar: '周', department: '设计学院', baseCredit: 95, color: '#b88758' },
  { id: 'chen', name: '陈同学', avatar: '陈', department: '管理学院', baseCredit: 93, color: '#6d85a1' },
  { id: 'he', name: '何同学', avatar: '何', department: '文学院', baseCredit: 96, color: '#a67f93' },
  { id: 'wu', name: '吴同学', avatar: '吴', department: '理学院', baseCredit: 90, color: '#8c8861' },
];

export const regions = ['东校区', '西校区', '生活区'];
export const places = ['东门驿站', '一食堂', '图书馆', '三号宿舍', '教学楼B座', '西门打印店', '二号宿舍', '校园超市', '二食堂', '实验楼'];
export const STORAGE_KEY = 'shunlu-campus-v1';

const categories: Category[] = ['快递代取', '食堂代买', '打印取送', '生活互助'];
const statuses: Status[] = ['open', 'active', 'delivered', 'completed', 'cancelled'];
const minute = 60_000;

export function createInitialState(now = Date.now()): AppState {
  const seeds: Array<Omit<Task, 'status' | 'createdAt' | 'deadline'> & { minutes: number }> = [
    { id: 'demo-express', title: '帮取一件小快递，送到三号宿舍', category: '快递代取', from: '东门驿站', to: '三号宿舍', region: '生活区', reward: 5, minutes: 90, description: '一件普通小包裹，约一本书大小。到宿舍楼下后联系我，我会下来领取。', ownerId: 'zhou', weight: '轻件 · 1kg以内', contactNote: '演示说明：接单后再交换取件信息，请勿填写真实取件码。' },
    { id: 'seed-lunch', title: '帮带一份一食堂的午餐', category: '食堂代买', from: '一食堂', to: '图书馆', region: '东校区', reward: 4, minutes: 45, description: '想带一份食堂套餐，不要辣。餐费另行沟通，此处仅展示跑腿报酬。', ownerId: 'chen', weight: '一份餐食', contactNote: '在图书馆门口碰面，食物不带入阅览区。' },
    { id: 'seed-print', title: '打印课程资料并送到教学楼', category: '打印取送', from: '西门打印店', to: '教学楼B座', region: '西校区', reward: 6, minutes: 120, description: '约二十页课程资料，黑白双面打印。接单后确认文件与打印费用。', ownerId: 'he', weight: '20页资料', contactNote: '教学楼一楼大厅交接，文件仅用于演示。' },
    { id: 'seed-market', title: '顺路帮带两瓶矿泉水', category: '生活互助', from: '校园超市', to: '二号宿舍', region: '生活区', reward: 3, minutes: 70, description: '两瓶普通瓶装水即可，商品费用另行确认。送到宿舍楼下交接。', ownerId: 'wu', weight: '约1kg', contactNote: '到达后留言，我会下楼。' },
    { id: 'seed-own', title: '帮取一个文件袋送到实验楼', category: '快递代取', from: '东门驿站', to: '实验楼', region: '东校区', reward: 5, minutes: 150, description: '轻薄文件袋，不含贵重物品。请保持文件平整，到实验楼门口交接。', ownerId: 'lin', weight: '轻件 · 文件袋', contactNote: '这是林同学发布的示例任务，可切换身份体验接单。' },
    { id: 'seed-dinner', title: '从二食堂帮带一份清淡晚餐', category: '食堂代买', from: '二食堂', to: '三号宿舍', region: '生活区', reward: 4, minutes: 180, description: '一份清淡套餐，不加辣椒。请先确认菜品和餐费，再开始购买。', ownerId: 'he', weight: '一份餐食', contactNote: '宿舍楼下交接，报酬不含餐费。' },
    { id: 'seed-notes', title: '帮送一份装订好的课堂笔记', category: '打印取送', from: '西门打印店', to: '图书馆', region: '西校区', reward: 5, minutes: 100, description: '一份已经装订好的课堂笔记，直接取走即可。请送到图书馆门口。', ownerId: 'chen', weight: '轻件 · 一册笔记', contactNote: '取件前确认订单，勿拿错其他同学的材料。' },
    { id: 'seed-free', title: '顺路归还一本借来的参考书', category: '生活互助', from: '二号宿舍', to: '教学楼B座', region: '东校区', reward: 0, minutes: 240, description: '一本轻薄参考书，想请顺路同学帮忙送给同学。愿意提供一次力所能及的互助。', ownerId: 'wu', weight: '轻件 · 一本书', contactNote: '无偿互助示例，交接地点为教学楼大厅。' },
  ];
  return {
    version: 1,
    currentUserId: 'lin',
    tasks: seeds.map(({ minutes, ...task }, index) => ({ ...task, status: 'open', deadline: now + minutes * minute, createdAt: now - (index + 1) * 3 * minute })),
    ledger: [],
  };
}

export function creditFor(state: AppState, userId: string): number {
  const base = profiles.find(profile => profile.id === userId)?.baseCredit ?? 0;
  return base + state.ledger.filter(entry => entry.userId === userId).reduce((sum, entry) => sum + entry.points, 0);
}

function findTask(state: AppState, taskId: string): Task {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) throw new Error('任务不存在，请返回任务广场。');
  return task;
}

function updateTask(state: AppState, task: Task, ledger = state.ledger): AppState {
  return { ...state, tasks: state.tasks.map(item => item.id === task.id ? task : item), ledger };
}

export function transition(state: AppState, taskId: string, action: 'accept' | 'deliver' | 'confirm' | 'cancel', now = Date.now()): AppState {
  const task = findTask(state, taskId);
  const userId = state.currentUserId;
  if (action === 'accept') {
    if (task.ownerId === userId) throw new Error('不能接自己发布的任务，请切换演示身份。');
    if (task.status !== 'open') throw new Error('该任务已不可接单。');
    if (task.deadline <= now) throw new Error('任务已超过截止时间，无法接单。');
    return updateTask(state, { ...task, status: 'active', runnerId: userId });
  }
  if (action === 'deliver') {
    if (task.runnerId !== userId) throw new Error('只有接单者可以标记送达。');
    if (task.status !== 'active') throw new Error('只有进行中的任务可以标记送达。');
    return updateTask(state, { ...task, status: 'delivered', deliveredAt: now });
  }
  if (action === 'confirm') {
    if (task.ownerId !== userId) throw new Error('只有发布者可以确认完成。');
    if (task.status !== 'delivered' || !task.runnerId) throw new Error('请等待接单者标记送达后再确认。');
    const id = `${task.id}-completion`;
    const ledger = state.ledger.some(entry => entry.id === id) ? state.ledger : [...state.ledger, { id, userId: task.runnerId, taskId, reason: '完成任务', points: 2, at: now }];
    return updateTask(state, { ...task, status: 'completed', completedAt: now }, ledger);
  }
  if (action === 'cancel') {
    if (task.ownerId !== userId) throw new Error('只有发布者可以取消任务。');
    if (task.status !== 'open') throw new Error('只有待接单任务可以取消。');
    return updateTask(state, { ...task, status: 'cancelled' });
  }
  throw new Error('不支持的任务操作。');
}

export function rateTask(state: AppState, taskId: string, rating: number, review: string, now = Date.now()): AppState {
  const task = findTask(state, taskId);
  if (task.ownerId !== state.currentUserId) throw new Error('只有发布者可以评价任务。');
  if (task.status !== 'completed' || !task.runnerId) throw new Error('任务确认完成后才可以评价。');
  if (task.rating !== undefined) throw new Error('该任务已经评价过了。');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('请选择1到5星评价。');
  if (typeof review !== 'string' || review.trim().length > 200) throw new Error('评价内容请控制在200字以内。');
  const id = `${task.id}-positive-review`;
  const ledger = rating >= 4 && !state.ledger.some(entry => entry.id === id)
    ? [...state.ledger, { id, userId: task.runnerId, taskId, reason: '收到好评', points: 1, at: now }]
    : state.ledger;
  return updateTask(state, { ...task, rating, review: review.trim() }, ledger);
}

export function publishTask(state: AppState, input: Omit<Task, 'id' | 'ownerId' | 'runnerId' | 'status' | 'createdAt' | 'deliveredAt' | 'completedAt' | 'rating' | 'review'>, now = Date.now()): AppState {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const from = typeof input.from === 'string' ? input.from.trim() : '';
  const to = typeof input.to === 'string' ? input.to.trim() : '';
  const weight = typeof input.weight === 'string' ? input.weight.trim() : '';
  if (title.length < 4 || title.length > 40) throw new Error('任务标题请填写4到40个字。');
  if (description.length < 5 || description.length > 300) throw new Error('任务说明请填写5到300个字。');
  if (!categories.includes(input.category)) throw new Error('请选择有效的任务分类。');
  if (!regions.includes(input.region)) throw new Error('请选择有效的任务区域。');
  if (!from || !to) throw new Error('请填写出发地点和送达地点。');
  if (from === to) throw new Error('出发地点和送达地点不能相同。');
  if (!weight || weight.length > 40) throw new Error('请填写40字以内的物品或重量说明。');
  if (!Number.isFinite(input.reward) || input.reward < 0 || input.reward > 100) throw new Error('跑腿报酬须为0到100元。');
  if (Math.abs(input.reward * 100 - Math.round(input.reward * 100)) > 0.000001) throw new Error('跑腿报酬最多保留两位小数。');
  if (!Number.isFinite(input.deadline) || input.deadline <= now) throw new Error('截止时间必须晚于当前时间。');
  if (typeof input.contactNote !== 'string' || input.contactNote.trim().length > 200) throw new Error('交接说明请控制在200字以内。');
  const task: Task = {
    id: `task-${now.toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
    title, category: input.category, from, to, region: input.region, reward: input.reward,
    deadline: input.deadline, description, weight, contactNote: input.contactNote.trim(),
    ownerId: state.currentUserId, status: 'open', createdAt: now,
  };
  return { ...state, tasks: [task, ...state.tasks] };
}

export function switchUser(state: AppState, userId: string): AppState {
  if (!profiles.some(profile => profile.id === userId)) throw new Error('该演示身份不存在。');
  return { ...state, currentUserId: userId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isKnownUser(value: unknown): value is string {
  return typeof value === 'string' && profiles.some(profile => profile.id === value);
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;
  if (!['id', 'title', 'from', 'to', 'region', 'description', 'weight', 'contactNote'].every(key => typeof value[key] === 'string')) return false;
  if (!value.id || !value.title || !categories.includes(value.category as Category) || !statuses.includes(value.status as Status)) return false;
  if (!isKnownUser(value.ownerId) || (value.runnerId !== undefined && (!isKnownUser(value.runnerId) || value.runnerId === value.ownerId))) return false;
  if (!isFiniteNumber(value.reward) || value.reward < 0 || value.reward > 100 || !isFiniteNumber(value.deadline) || !isFiniteNumber(value.createdAt)) return false;
  if (['active', 'delivered', 'completed'].includes(value.status as string) && !value.runnerId) return false;
  if (['open', 'cancelled'].includes(value.status as string) && value.runnerId !== undefined) return false;
  if (value.deliveredAt !== undefined && !isFiniteNumber(value.deliveredAt)) return false;
  if (value.completedAt !== undefined && !isFiniteNumber(value.completedAt)) return false;
  if (['delivered', 'completed'].includes(value.status as string) && value.deliveredAt === undefined) return false;
  if (value.status === 'completed' && value.completedAt === undefined) return false;
  if (value.rating !== undefined && (value.status !== 'completed' || !Number.isInteger(value.rating) || (value.rating as number) < 1 || (value.rating as number) > 5)) return false;
  if (value.review !== undefined && typeof value.review !== 'string') return false;
  return true;
}

function isState(value: unknown): value is AppState {
  if (!isRecord(value) || value.version !== 1 || !isKnownUser(value.currentUserId) || !Array.isArray(value.tasks) || !Array.isArray(value.ledger)) return false;
  if (!value.tasks.every(isTask) || new Set(value.tasks.map(task => task.id)).size !== value.tasks.length) return false;
  if (!value.ledger.every(entry => isRecord(entry) && typeof entry.id === 'string' && isKnownUser(entry.userId) && typeof entry.taskId === 'string' && typeof entry.reason === 'string' && isFiniteNumber(entry.points) && isFiniteNumber(entry.at))) return false;
  return new Set(value.ledger.map(entry => entry.id)).size === value.ledger.length;
}

export function loadState(): AppState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isState(parsed)) return parsed;
    }
  } catch {
    // Storage may be disabled or contain an interrupted/older save.
  }
  return createInitialState();
}
