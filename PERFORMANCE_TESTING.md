# 性能测试与监控系统使用说明

## 概述

性能测试与监控系统用于模拟高压场景并实时监控游戏性能，帮助识别性能瓶颈。

## 快速开始

### 1. 打开性能监控面板

- 按 **Ctrl+P** 切换性能监控面板的显示/隐藏
- 或在控制台执行：`testManager.monitor.toggle()`

### 2. 运行测试场景

在浏览器控制台中执行以下命令：

#### 测试场景 1: 大量敌人
```javascript
// 生成100个基础敌人
testManager.runTest('manyEnemies', 100);

// 生成50个坦克敌人
testManager.runTest('manyEnemies', 50, 'tank');

// 生成30个快速敌人
testManager.runTest('manyEnemies', 30, 'fast');
```

#### 测试场景 2: 大量单位（Formation/Swarm）
```javascript
// 生成20个Formation敌人 + 20个Swarm敌人
// Formation和Swarm包含多个单位，压力较大
testManager.runTest('manyUnits', 20, 20);
```

#### 测试场景 3: 大量子弹
```javascript
// 生成200个子弹组
testManager.runTest('manyBullets', 200);
```

#### 测试场景 4: 大量特效
```javascript
// 同时生成100个爆炸特效
testManager.runTest('manyEffects', 100);
```

#### 测试场景 5: 组合压力测试
```javascript
// 运行综合压力测试（包含多种场景）
testManager.runTest('combined');
```

#### 测试场景 6: 音频可靠性测试
```javascript
// 运行完整音频可靠性测试套件（6项）
testManager.runTest('audio');

// 等价调用（直接调用音频测试器）
audioTests.runAll();

// 只跑单项测试
audioTests.run('game_start_unlocks_before_music');
```

### 3. 停止测试

```javascript
testManager.stopTest();
```

## 性能监控面板

性能监控面板显示以下信息：

### 实时指标
- **FPS (帧率)**: 当前帧率，颜色编码：
  - 绿色: ≥55 FPS (流畅)
  - 黄色: 30-54 FPS (可接受)
  - 红色: <30 FPS (卡顿)
  
- **Frame Time (帧时间)**:
  - Avg: 平均帧时间
  - Min: 最小帧时间
  - Max: 最大帧时间
  - 颜色编码同上

### 实体计数
实时显示各种实体的数量：
- **Enemies**: 活跃敌人数量
- **Bullet Groups**: 活跃子弹组数量
- **Effects**: 活跃特效数量
- **Powerups**: 活跃道具数量
- **XP Texts**: 活跃经验文本数量

### 性能警告
当帧时间超过阈值时记录警告：
- **警告阈值**: 33ms (30 FPS)
- **严重阈值**: 50ms (20 FPS)

警告信息包含：
- 时间戳
- 警告类型
- 帧时间
- 当时的实体数量

## 测试场景详解

### 1. manyEnemies (大量敌人)
- **目的**: 测试大量敌人同时存在时的性能
- **参数**: 
  - `count`: 敌人数量 (默认: 100)
  - `type`: 敌人类型 (默认: 'basic')
- **影响**: 
  - 每个敌人都需要更新位置和绘制
  - Formation/Swarm类型的敌人压力更大（包含多个单位）

### 2. manyUnits (大量单位)
- **目的**: 测试Formation和Swarm敌人（包含多个单位的敌人）
- **参数**:
  - `formationCount`: Formation敌人数量 (默认: 20)
  - `swarmCount`: Swarm敌人数量 (默认: 20)
- **影响**:
  - 每个Formation/Swarm包含多个单位（通常3-20个）
  - 需要为每个单位单独绘制和碰撞检测

### 3. manyBullets (大量子弹)
- **目的**: 测试大量子弹同时存在的性能
- **参数**:
  - `bulletGroupCount`: 子弹组数量 (默认: 200)
- **影响**:
  - 每个子弹组需要更新和绘制
  - 大量子弹会触发大量碰撞检测

### 4. manyEffects (大量特效)
- **目的**: 测试大量特效同时播放的性能
- **参数**:
  - `effectCount`: 特效数量 (默认: 100)
- **影响**:
  - 每个特效包含多个粒子
  - 特效绘制需要大量Canvas操作

### 5. combined (组合压力测试)
- **目的**: 综合测试所有场景
- **执行步骤**:
  1. 生成50个基础敌人
  2. 生成20个Formation敌人
  3. 生成20个Swarm敌人
  4. 生成50个特效
- **影响**: 模拟游戏中最严重的性能压力情况

### 6. audio (音频可靠性测试)
- **目的**: 验证短音效在浏览器自动播放限制下的稳定性，重点覆盖 SFX 排队、解锁、刷新和调用顺序。
- **入口**:
  - `testManager.runTest('audio')`
  - `audioTests.runAll()`
- **单项测试**:
  1. `queue_when_playback_blocked`: 播放被阻塞时是否进入待播放队列。
  2. `flush_drops_expired_entries`: 刷新队列时是否丢弃过期音效（>1.5s）。
  3. `unlock_resumes_contexts_and_flushes`: `unlockAudio()` 是否恢复 SFX/Music context 并触发队列刷新。
  4. `play_routes_buffer_sound`: `AudioManager.play()` 对 buffer-backed 音效是否正确走 `playBufferedSound()`。
  5. `set_volume_updates_html_audio_only`: 主音量更新是否只影响 `HTMLAudio`，不覆盖 buffer-backed 对象字段。
  6. `game_start_unlocks_before_music`: `Game.start()` 是否先解锁音频再启动背景音乐。
- **约束**:
  - 音频测试会临时替换 `audioManager` 的部分方法进行断言，结束后自动恢复。
  - 建议在浏览器前台标签页执行，避免后台节流影响时间相关断言。

## 性能优化建议

基于测试结果，可以采取以下优化措施：

### 如果敌人数量导致卡顿:
1. 限制屏幕内同时存在的敌人数量
2. 减少Formation/Swarm敌人的单位数量
3. 优化敌人绘制（减少渐变和阴影）

### 如果子弹数量导致卡顿:
1. 限制子弹组的最大数量
2. 优化碰撞检测算法
3. 使用对象池复用子弹组

### 如果特效导致卡顿:
1. 限制同时存在的特效数量
2. 减少每个特效的粒子数量
3. 提前清理不活跃的特效

### 如果绘制导致卡顿:
1. 减少Canvas操作的复杂度
2. 使用离屏Canvas缓存静态元素
3. 减少shadowBlur和渐变的使用

## 高级用法

### 直接访问监控器
```javascript
// 清除性能数据
testManager.monitor.clear();

// 手动更新（通常自动调用）
testManager.monitor.update(frameTime);
```

### 直接访问测试器
```javascript
// 检查是否有测试在运行
if (testManager.tests.active) {
    console.log('Test is running:', testManager.tests.scenario.name);
}

// 手动更新测试（通常自动调用）
testManager.tests.update();
```

### 音频测试工具
```javascript
// 跑完整音频套件并拿到汇总
const summary = await audioTests.runAll();
console.log(summary); // { total, passed, failed, results }

// 查看最近一次汇总
console.log(audioTests.getSummary());

// 只跑某一项
await audioTests.run('queue_when_playback_blocked');
```

### 自定义测试场景
可以扩展 `PerformanceTest` 类添加自定义测试场景：

```javascript
// 在js/test.js中添加新方法
testManyCarriers(count = 5) {
    // 生成多个航母（会持续生成小兵）
    // ...
}
```

## 注意事项

1. **测试会影响游戏性**: 运行测试时会修改游戏状态，建议在开发/测试环境使用
2. **自动清理**: 测试结束后会自动清理或恢复原始状态
3. **性能影响**: 监控系统本身有轻微性能开销，正常游戏中可以关闭
4. **浏览器兼容性**: 需要支持ES6+和Canvas API的现代浏览器

## 故障排除

### 监控面板不显示
- 检查是否按了 Ctrl+P
- 检查浏览器控制台是否有错误
- 确认 `js/test.js` 已正确加载

### 测试无法运行
- 对性能场景（manyEnemies/manyUnits/manyBullets/manyEffects/combined），确保游戏处于 `playing` 状态
- `audio` 测试不要求预先进入 `playing`，但需要 `game.audioManager` 可用
- 检查控制台是否有错误信息
- 确认测试参数正确

### 性能数据不准确
- 关闭其他标签页和应用以释放资源
- 等待几秒钟让数据稳定
- 检查是否有后台任务影响性能

### 音频测试失败或无声
- 先点击页面任意位置或按任意键，触发浏览器音频解锁，再重跑 `audioTests.runAll()`
- 确认控制台中 `Audio Reliability Tests` 分组日志是否完整输出
- 若仅 `game_start_unlocks_before_music` 失败，检查 `Game.start()` 中调用顺序是否仍为：
  1. `audioManager.unlockAudio()`
  2. `audioManager.startBackgroundMusic(...)`

