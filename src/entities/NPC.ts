import { Random } from '../utils/Random';
import { clamp, distance } from '../utils/Math';
import { findPath, PathNode } from '../world/Pathfinding';
import { TileMap, TileType } from '../world/TileMap';
import { WorldObjectManager, ObjectType } from '../world/WorldObject';
import { TimeSystem } from '../world/TimeSystem';
import type { WeatherState, Weather } from '../world/Weather';
import { WorldConfig } from '../engine/Config';
import { Needs, createDefaultNeeds } from './Needs';
import { MemorySystem } from './Memory';
import { Personality, createRandomPersonality } from './Personality';
import { RelationshipSystem } from './Relationship';
import { Inventory, createEmptyInventory, addResource, totalResources } from './Inventory';
import { Skills, createDefaultSkills, grantSkillXP, getSkillBonus } from './Skills';
import { evaluateTrade, executeTrade } from './Trading';
import { getAvailableRecipes, craftItem, isToolRecipe, createTool, useTool, isToolBroken, type ToolInfo } from '../engine/Crafting';
import type { ActionType } from '../ai/Action';
import { BehaviorTreeBrain } from '../ai/BehaviorTreeBrain';
import { buildPerception } from '../ai/Perception';
import { generateNPCName } from './Names';
import { FatigueTracker } from './Fatigue';
import { StatusEffectManager, evaluateStatusEffects } from './StatusEffects';
import { TerritorySystem } from './Territory';
import { ReputationSystem, REPUTATION_PER_TRADE, REPUTATION_PER_CRAFT, REPUTATION_PER_SOCIAL } from './Reputation';
import { REPUTATION_PER_BUILD } from './Structure';
import type { StructureManager } from './Structure';
import { TitleTracker, checkTitleEligibility } from './Titles';
import { determineMood, type MoodEmote } from './MoodEmotes';
import { getAgeTier, type AgeTierType } from './AgeTier';

export interface NPCAppearance {
  skinTone: number;
  hairColor: number;
  shirtColor: number;
  pantsColor: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

const MOVE_TICKS = 8;
const FORAGE_TICKS = 30;
const FISH_TICKS = 40;
const MOVING_ENERGY_MULTIPLIER = 1.5;
const IDLE_ENERGY_DRAIN_BASE = 0.003;
/** Maximum top memories to consider for knowledge sharing */
const KNOWLEDGE_SHARE_POOL_SIZE = 10;
/** Maximum memories to transfer per socialization */
const KNOWLEDGE_SHARE_MAX = 2;
/** Position proximity threshold for duplicate memory detection */
const MEMORY_POSITION_THRESHOLD = 2;

const brain = new BehaviorTreeBrain();

export class NPC {
  readonly id: string;
  readonly name: string;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  needs: Needs;
  memory: MemorySystem;
  personality: Personality;
  relationships: RelationshipSystem;
  inventory: Inventory;
  skills: Skills;
  appearance: NPCAppearance;
  direction: Direction;
  isMoving: boolean;
  currentAction: ActionType;
  targetX: number;
  targetY: number;
  targetNpcId: string | null;
  path: PathNode[];
  pathIndex: number;
  alive: boolean;
  age: number;
  starvationTimer: number;
  moveTimer: number;
  actionTimer: number;
  tilesVisited: Set<string>;
  /** Ticks the NPC has spent within its familiar area (for boredom acceleration) */
  staleAreaTicks: number;
  spawnAnimation: number;
  deathAnimation: number;
  idlePhase: number;

  /** Feature: Fatigue system tracking work exhaustion */
  fatigue: FatigueTracker;
  /** Feature: Status effects (buffs/debuffs) */
  statusEffects: StatusEffectManager;
  /** Feature: Territory/home system */
  territory: TerritorySystem;
  /** Feature: Reputation system */
  reputation: ReputationSystem;
  /** Feature: Title tracking */
  titles: TitleTracker;
  /** Feature: Current mood emote */
  currentMood: MoodEmote;
  /** Feature: Current age tier */
  ageTier: AgeTierType;
  /** Whether this NPC was part of the original spawn */
  isOriginal: boolean;
  /** Count of items crafted by this NPC */
  craftCount: number;
  /** Whether this NPC has survived a storm */
  survivedStorm: boolean;
  /** Currently equipped tool, if any */
  equippedTool: ToolInfo | null;
  /** Tick of last reproduction event (for spawning cooldown) */
  lastReproductionTick: number;
  /** Number of structures this NPC has contributed to */
  buildContributions: number;

  private rng: Random;

  constructor(id: string, x: number, y: number, rng: Random, config: WorldConfig) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.rng = rng;
    this.needs = createDefaultNeeds(() => rng.next());
    this.memory = new MemorySystem(config.memoryCapacity);
    this.personality = createRandomPersonality(() => rng.next());
    this.relationships = new RelationshipSystem();
    this.inventory = createEmptyInventory();
    this.skills = createDefaultSkills();
    this.name = generateNPCName(this.personality, () => rng.next());
    this.appearance = {
      skinTone: rng.nextInt(4),
      hairColor: rng.nextInt(6),
      shirtColor: rng.nextInt(8),
      pantsColor: rng.nextInt(6),
    };
    this.direction = 'down';
    this.isMoving = false;
    this.currentAction = 'IDLE';
    this.targetX = x;
    this.targetY = y;
    this.targetNpcId = null;
    this.path = [];
    this.pathIndex = 0;
    this.alive = true;
    this.age = 0;
    this.starvationTimer = 0;
    this.moveTimer = 0;
    this.actionTimer = 0;
    this.tilesVisited = new Set<string>();
    this.tilesVisited.add(`${Math.floor(x)},${Math.floor(y)}`);
    this.staleAreaTicks = 0;
    this.spawnAnimation = 0;
    this.deathAnimation = 0;
    this.idlePhase = rng.next() * Math.PI * 2;

    // Initialize new feature systems
    this.fatigue = new FatigueTracker();
    this.statusEffects = new StatusEffectManager();
    this.territory = new TerritorySystem();
    this.reputation = new ReputationSystem();
    this.titles = new TitleTracker();
    this.currentMood = determineMood(this.needs, this.currentAction);
    this.ageTier = getAgeTier(this.age);
    this.isOriginal = false;
    this.craftCount = 0;
    this.survivedStorm = false;
    this.equippedTool = null;
    this.lastReproductionTick = 0;
    this.buildContributions = 0;
  }

  update(
    config: WorldConfig,
    weather: WeatherState,
    timeSystem: TimeSystem,
    tileMap: TileMap,
    objects: WorldObjectManager,
    allNPCs: NPC[],
    weatherSystem: Weather,
    structureManager?: StructureManager,
  ): void {
    if (!this.alive) {
      this.deathAnimation = clamp(this.deathAnimation + 0.05, 0, 1);
      return;
    }

    this.age++;
    this.spawnAnimation = clamp(this.spawnAnimation + 0.05, 0, 1);
    this.idlePhase += 0.05;

    // Update age tier
    this.ageTier = getAgeTier(this.age);

    const nearbyNPCs = this.getNearbyNPCs(allNPCs, config.socialRange);
    this.updateNeeds(config, weather, timeSystem, nearbyNPCs, tileMap, structureManager);
    this.memory.update(config.memoryDecayRate);
    this.relationships.update(config.memoryDecayRate * 0.5);

    // Update status effects
    const inShelter = this.isInShelter(tileMap, structureManager);
    const isStorm = weather === 'storm';
    const isNight = timeSystem.isNight();
    const effectChanges = evaluateStatusEffects(
      this.needs, inShelter, nearbyNPCs.length, isStorm, isNight,
    );
    for (const eff of effectChanges.add) {
      this.statusEffects.addEffect(eff, 100);
    }
    for (const eff of effectChanges.remove) {
      this.statusEffects.removeEffect(eff);
    }
    this.statusEffects.update();

    // Update fatigue
    this.fatigue.addWorkFatigue(this.currentAction);

    // Update territory familiarity
    this.territory.updateFamiliarity(this.x, this.y);

    // Update mood
    this.currentMood = determineMood(this.needs, this.currentAction);

    // Check title eligibility periodically (every 120 ticks)
    if (this.age % 120 === 0) {
      const friendCount = this.relationships.getRelationships().filter(r => r.affinity >= 0.4).length;
      const eligible = checkTitleEligibility({
        age: this.age,
        tilesVisited: this.tilesVisited.size,
        craftCount: this.craftCount,
        friendshipCount: friendCount,
        foragingSkill: this.skills.foraging,
        totalResources: totalResources(this.inventory),
        isOriginal: this.isOriginal,
        survivedStorm: this.survivedStorm,
        mapWidth: config.worldSize,
        visitedPositions: this.tilesVisited,
      });
      for (const titleId of eligible) {
        this.titles.earnTitle(titleId);
      }
    }

    // Check starvation
    if (this.needs.hunger <= 0) {
      this.starvationTimer++;
      if (this.starvationTimer >= config.starvationTicks) {
        this.alive = false;
        return;
      }
    } else {
      this.starvationTimer = 0;
    }

    // AI decision
    const perception = buildPerception(
      this, tileMap, objects, allNPCs, timeSystem, weatherSystem,
      this.x, this.y, 1, config.craftInventoryThreshold,
    );
    const action = brain.decide(perception);
    this.currentAction = action.type;
    this.targetX = action.targetX;
    this.targetY = action.targetY;
    this.targetNpcId = action.targetNpcId ?? null;

    // Pathfind if target changed significantly
    const distToTarget = distance(this.x, this.y, this.targetX, this.targetY);
    if (distToTarget > 1.5 && (this.path.length === 0 || this.pathIndex >= this.path.length)) {
      const newPath = findPath(
        tileMap,
        Math.floor(this.x), Math.floor(this.y),
        Math.floor(this.targetX), Math.floor(this.targetY),
        50,
      );
      if (newPath) {
        this.path = newPath;
        this.pathIndex = 0;
      }
    }

    // Find trade partner for socializing (only when needed)
    const tradePartner = (this.currentAction === 'SOCIALIZE' && this.targetNpcId)
      ? allNPCs.find(n => n.id === this.targetNpcId && n.alive) ?? null
      : null;

    this.executeAction(tileMap, objects, config, tradePartner, structureManager, allNPCs);
    this.moveAlongPath();
  }

  private updateNeeds(
    config: WorldConfig,
    weather: WeatherState,
    timeSystem: TimeSystem,
    nearbyNPCs: NPC[],
    tileMap: TileMap,
    structureManager?: StructureManager,
  ): void {
    const isStorm = weather === 'storm';
    const isRain = weather === 'rain';
    const isNight = timeSystem.isNight();
    const inShelter = this.isInShelter(tileMap, structureManager);

    // Query structure effects at current position
    const effects = structureManager?.getStructureEffects(this.x, this.y);

    // --- Hunger drain ---
    // Fix 1 & 2: Moving costs more hunger; storms burn extra calories.
    let hungerDrain = config.hungerDrain;
    if (this.isMoving) hungerDrain *= 1.5;
    if (isStorm || weather === 'snow') hungerDrain *= config.stormHungerMultiplier;
    this.needs.hunger = clamp(this.needs.hunger - hungerDrain, 0, 1);

    // --- Energy drain ---
    // Fix 1: Significant drain while moving (at least 0.006/tick); idle still
    // drains (0.003/tick minimum). Night × 1.5, storm × 1.8. REST recovery is
    // +0.015/tick standing, +0.03/tick in shelter — slow enough to cost time.
    let energyDrain: number;
    if (this.currentAction === 'REST') {
      // REST provides net recovery instead of drain
      let restRecovery = inShelter ? 0.03 : 0.015;
      // Well bonus: +25% energy recovery during REST
      if (effects?.nearWell) restRecovery *= 1.25;
      this.needs.energy = clamp(this.needs.energy + restRecovery, 0, 1);
      energyDrain = 0; // skip normal drain path
    } else {
      energyDrain = this.isMoving
        ? config.energyDrain * MOVING_ENERGY_MULTIPLIER
        : Math.max(IDLE_ENERGY_DRAIN_BASE, config.energyDrain * 0.6);
      if (isNight) energyDrain *= config.nightEnergyMultiplier;
      if (isStorm) energyDrain *= config.stormEnergyMultiplier;
      // Fix 5: Social isolation increases energy drain
      if (this.needs.social < config.socialDebuffThreshold && nearbyNPCs.length === 0) {
        energyDrain *= config.socialIsolationEnergyMultiplier;
      }
      this.needs.energy = clamp(this.needs.energy - energyDrain, 0, 1);
    }

    // --- Social drain ---
    // Fix 5: Drains when no NPC within socialRange; recovers when nearby NPCs.
    if (nearbyNPCs.length === 0) {
      this.needs.social = clamp(this.needs.social - config.socialDrain, 0, 1);
    }

    // --- Curiosity drain ---
    // Drains when NPC is on already-visited tiles. staleAreaTicks tracks
    // consecutive ticks on familiar ground; resets when a new tile is visited.
    // Boredom acceleration: 2× after boredomAccelTicks, 3× after boredomSevereTicks.
    const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
    if (this.tilesVisited.has(tileKey)) {
      this.staleAreaTicks++;
      if (this.staleAreaTicks > config.curiosityStaleTicks) {
        let curiosityMultiplier = 1;
        if (this.staleAreaTicks > config.boredomSevereTicks) {
          curiosityMultiplier = 3;
        } else if (this.staleAreaTicks > config.boredomAccelTicks) {
          curiosityMultiplier = 2;
        }
        this.needs.curiosity = clamp(
          this.needs.curiosity - config.curiosityDrain * curiosityMultiplier, 0, 1,
        );
      }
    } else {
      // New tile discovered — reset stale area counter
      this.staleAreaTicks = 0;
    }

    // --- Safety drain ---
    // Fix 2: Storm drops safety 0.04/tick, rain 0.01/tick, night outdoors
    // 0.02/tick. Night + storm stacks to 0.06/tick.
    if (isStorm) {
      // Watchtower reduces storm safety drain by 30%
      const stormPenalty = effects?.nearWatchtower
        ? config.stormSafetyPenalty * 0.7
        : config.stormSafetyPenalty;
      this.needs.safety = clamp(this.needs.safety - stormPenalty, 0, 1);
    }
    if (isRain && !isStorm) {
      this.needs.safety = clamp(this.needs.safety - config.rainSafetyPenalty, 0, 1);
    }
    if (isNight && !inShelter) {
      this.needs.safety = clamp(this.needs.safety - config.nightSafetyPenalty, 0, 1);
    }

    // Safety recovery in shelter or calm daytime
    // Hut and Watchtower provide +50% safety recovery
    let safetyRecovery = config.safetyRecovery;
    if (effects?.nearHut || effects?.nearWatchtower) safetyRecovery *= 1.5;
    if (!isNight || inShelter) {
      if (!isStorm) {
        this.needs.safety = clamp(this.needs.safety + safetyRecovery, 0, 1);
      }
    }
  }

  private executeAction(tileMap: TileMap, objects: WorldObjectManager, config: WorldConfig, tradePartner: NPC | null, structureManager?: StructureManager, allNPCs?: NPC[]): void {
    this.actionTimer++;

    switch (this.currentAction) {
      case 'FORAGE': {
        // Apply shovel speed bonus for berry foraging
        let effectiveForageTicks = FORAGE_TICKS;
        if (this.equippedTool && !isToolBroken(this.equippedTool) &&
            this.equippedTool.targetResource === 'berries') {
          effectiveForageTicks = Math.floor(FORAGE_TICKS / this.equippedTool.gatherSpeedModifier);
        }
        if (this.actionTimer >= effectiveForageTicks) {
          // Try to harvest a nearby object
          const obj = objects.getObjectAt(Math.floor(this.targetX), Math.floor(this.targetY));
          if (obj && obj.type === ObjectType.BerryBush) {
            const harvested = objects.harvestObject(obj.id, config.foodRespawnTicks);
            if (harvested) {
              const bonus = getSkillBonus(this.skills, 'foraging');
              this.needs.hunger = clamp(this.needs.hunger + 0.3 * bonus, 0, 1);
              grantSkillXP(this.skills, 'foraging');
              // Use shovel if applicable
              if (this.equippedTool && this.equippedTool.targetResource === 'berries') {
                useTool(this.equippedTool);
                if (isToolBroken(this.equippedTool)) this.equippedTool = null;
              }
              this.memory.addMemory({
                type: 'found_food',
                tick: this.age,
                x: obj.x,
                y: obj.y,
                significance: 0.8,
              });
            }
          }
          this.actionTimer = 0;
          this.currentAction = 'IDLE';
        }
        break;
      }
      case 'REST': {
        // REST recovery is handled in updateNeeds to ensure consistent
        // drain/recovery ordering each tick. No additional recovery here.
        // Update fatigue during rest
        this.fatigue.rest(this.isInShelter(tileMap, structureManager));
        break;
      }
      case 'SOCIALIZE': {
        const socialBonus = getSkillBonus(this.skills, 'socializing');
        // Meeting Hall doubles social recovery rate
        const meetingHallEffects = structureManager?.getStructureEffects(this.x, this.y);
        const socialMultiplier = meetingHallEffects?.nearMeetingHall ? 2 : 1;
        this.needs.social = clamp(
          this.needs.social + config.socialRecovery * socialBonus * socialMultiplier,
          0, 1,
        );
        grantSkillXP(this.skills, 'socializing');
        this.reputation.addReputation(REPUTATION_PER_SOCIAL, 'socializing');
        if (this.targetNpcId) {
          this.relationships.interact(this.targetNpcId, this.age);
          // Attempt trade with socializing partner
          if (tradePartner) {
            const affinity = this.relationships.getRelationship(this.targetNpcId)?.affinity ?? 0;
            const trade = evaluateTrade(
              this.inventory, this.needs,
              tradePartner.inventory, tradePartner.needs,
              affinity,
            );
            if (trade.occurred) {
              executeTrade(this.inventory, tradePartner.inventory, trade);
              this.reputation.addReputation(REPUTATION_PER_TRADE, 'trading');
            }
            // Knowledge sharing: exchange memories with partner
            this.shareKnowledge(tradePartner);
          }
        }
        break;
      }
      case 'EXPLORE': {
        // Fix 4: New tile discovery gives configurable curiosity reward.
        // Discovering a resource location gives a stronger reward.
        const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
        if (!this.tilesVisited.has(tileKey)) {
          // Check if there's a resource here for the stronger reward
          const obj = objects.getObjectAt(Math.floor(this.x), Math.floor(this.y));
          const reward = obj ? config.curiosityNewResourceReward : config.curiosityNewTileReward;
          this.needs.curiosity = clamp(this.needs.curiosity + reward, 0, 1);
          this.tilesVisited.add(tileKey);
          grantSkillXP(this.skills, 'exploring');
          this.memory.addMemory({
            type: 'discovered_area',
            tick: this.age,
            x: Math.floor(this.x),
            y: Math.floor(this.y),
            significance: 0.3,
          });
        }
        break;
      }
      case 'SEEK_SHELTER': {
        const d = distance(this.x, this.y, this.targetX, this.targetY);
        if (d < 2) {
          this.memory.addMemory({
            type: 'found_shelter',
            tick: this.age,
            x: Math.floor(this.targetX),
            y: Math.floor(this.targetY),
            significance: 0.7,
          });
        }
        break;
      }
      case 'IDLE': {
        this.needs.safety = clamp(this.needs.safety + 0.005, 0, 1);
        break;
      }
      case 'GATHER': {
        // Apply tool speed bonus: reduce effective gather time
        let effectiveGatherTicks = config.gatherTicks;
        if (this.equippedTool && !isToolBroken(this.equippedTool)) {
          const obj = objects.getObjectAt(Math.floor(this.targetX), Math.floor(this.targetY));
          const isWoodTarget = obj && (obj.type === ObjectType.OakTree || obj.type === ObjectType.PineTree || obj.type === ObjectType.BirchTree);
          const isStoneTarget = obj && obj.type === ObjectType.Rock;
          if ((isWoodTarget && this.equippedTool.targetResource === 'wood') ||
              (isStoneTarget && this.equippedTool.targetResource === 'stone')) {
            effectiveGatherTicks = Math.floor(config.gatherTicks / this.equippedTool.gatherSpeedModifier);
          }
        }
        if (this.actionTimer >= effectiveGatherTicks) {
          const obj = objects.getObjectAt(Math.floor(this.targetX), Math.floor(this.targetY));
          if (obj) {
            if ((obj.type === ObjectType.OakTree || obj.type === ObjectType.PineTree || obj.type === ObjectType.BirchTree)
                && obj.state !== 'depleted') {
              const harvested = objects.harvestObject(obj.id, config.foodRespawnTicks);
              if (harvested) {
                addResource(this.inventory, 'wood', 1);
                grantSkillXP(this.skills, 'building');
                // Use tool if applicable
                if (this.equippedTool && this.equippedTool.targetResource === 'wood') {
                  useTool(this.equippedTool);
                  if (isToolBroken(this.equippedTool)) this.equippedTool = null;
                }
                this.memory.addMemory({
                  type: 'gathered_resource',
                  tick: this.age,
                  x: obj.x,
                  y: obj.y,
                  significance: 0.4,
                  detail: 'wood',
                });
              }
            } else if (obj.type === ObjectType.Rock && obj.state !== 'depleted') {
              const harvested = objects.harvestObject(obj.id, config.foodRespawnTicks);
              if (harvested) {
                addResource(this.inventory, 'stone', 1);
                grantSkillXP(this.skills, 'building');
                // Use tool if applicable
                if (this.equippedTool && this.equippedTool.targetResource === 'stone') {
                  useTool(this.equippedTool);
                  if (isToolBroken(this.equippedTool)) this.equippedTool = null;
                }
                this.memory.addMemory({
                  type: 'gathered_resource',
                  tick: this.age,
                  x: obj.x,
                  y: obj.y,
                  significance: 0.4,
                  detail: 'stone',
                });
              }
            }
          }
          this.actionTimer = 0;
          this.currentAction = 'IDLE';
        }
        break;
      }
      case 'CRAFT': {
        if (this.actionTimer >= config.craftTicks) {
          const recipes = getAvailableRecipes(this.inventory);
          if (recipes.length > 0) {
            const recipe = recipes[0];
            if (craftItem(this.inventory, recipe)) {
              if (isToolRecipe(recipe)) {
                // Tool recipes produce a tool equipped by the NPC
                this.equippedTool = createTool(recipe.toolResult!);
              } else if (recipe.result) {
                objects.addObjectAt(recipe.result, Math.floor(this.x), Math.floor(this.y));
              }
              grantSkillXP(this.skills, 'crafting');
              this.reputation.addReputation(REPUTATION_PER_CRAFT, 'crafting');
              this.craftCount++;
              this.memory.addMemory({
                type: 'crafted_item',
                tick: this.age,
                x: Math.floor(this.x),
                y: Math.floor(this.y),
                significance: 0.9,
                detail: recipe.name,
              });
              // Claim territory near first craft
              if (!this.territory.hasHome()) {
                this.territory.claimHome(Math.floor(this.x), Math.floor(this.y), this.age);
              }
            }
          }
          this.actionTimer = 0;
          this.currentAction = 'IDLE';
        }
        break;
      }
      case 'BUILD': {
        if (structureManager && this.actionTimer >= config.buildTicks) {
          // Find the construction site at our target location
          const obj = objects.getObjectAt(Math.floor(this.targetX), Math.floor(this.targetY));
          if (obj && obj.type === ObjectType.ConstructionSite && obj.structureData) {
            const contributed = structureManager.contributeResources(obj.id, this.id, this.inventory);
            if (contributed) {
              grantSkillXP(this.skills, 'building');
              this.buildContributions++;
              // Check if structure is now complete
              if (structureManager.checkCompletion(obj.id, this.age)) {
                // All contributors get reputation boost and memory
                for (const contributorId of obj.structureData.contributors) {
                  const contributor = allNPCs?.find(n => n.id === contributorId);
                  if (contributor) {
                    contributor.reputation.addReputation(REPUTATION_PER_BUILD, 'building');
                    contributor.memory.addMemory({
                      type: 'built_structure',
                      tick: contributor.age,
                      x: obj.x,
                      y: obj.y,
                      significance: 0.9,
                      detail: obj.structureData.structureType,
                    });
                  }
                }
                // Completing NPC claims territory if they have no home
                if (!this.territory.hasHome()) {
                  this.territory.claimHome(Math.floor(obj.x), Math.floor(obj.y), this.age);
                }
              }
            }
          }
          this.actionTimer = 0;
        }
        break;
      }
      case 'FISH': {
        if (this.actionTimer >= FISH_TICKS) {
          // Fish from water — requires fishing rod
          if (this.equippedTool && this.equippedTool.type === 'fishing_rod' && !isToolBroken(this.equippedTool)) {
            const bonus = getSkillBonus(this.skills, 'foraging');
            this.needs.hunger = clamp(this.needs.hunger + 0.35 * bonus, 0, 1);
            grantSkillXP(this.skills, 'foraging');
            useTool(this.equippedTool);
            if (isToolBroken(this.equippedTool)) this.equippedTool = null;
            this.memory.addMemory({
              type: 'found_food',
              tick: this.age,
              x: Math.floor(this.x),
              y: Math.floor(this.y),
              significance: 0.7,
              detail: 'fish',
            });
          }
          this.actionTimer = 0;
          this.currentAction = 'IDLE';
        }
        break;
      }
    }
  }

  private moveAlongPath(): void {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.isMoving = false;
      return;
    }

    this.moveTimer++;
    if (this.moveTimer < MOVE_TICKS) return;
    this.moveTimer = 0;

    const next = this.path[this.pathIndex];
    this.prevX = this.x;
    this.prevY = this.y;

    // Update direction based on movement
    const dx = next.x - this.x;
    const dy = next.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx > 0 ? 'right' : 'left';
    } else {
      this.direction = dy > 0 ? 'down' : 'up';
    }

    this.x = next.x;
    this.y = next.y;
    this.isMoving = true;
    this.pathIndex++;

    // Mark tile as visited
    const tileKey = `${Math.floor(this.x)},${Math.floor(this.y)}`;
    this.tilesVisited.add(tileKey);
  }

  getNearbyNPCs(allNPCs: NPC[], radius: number): NPC[] {
    return allNPCs.filter(other =>
      other.id !== this.id &&
      other.alive &&
      distance(this.x, this.y, other.x, other.y) <= radius
    );
  }

  isInShelter(tileMap: TileMap, structureManager?: StructureManager): boolean {
    // Near cave wall
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tile = tileMap.getTile(Math.floor(this.x) + dx, Math.floor(this.y) + dy);
        if (tile && tile.type === TileType.CaveWall) return true;
      }
    }
    // Near a completed Hut (within 3 tiles)
    if (structureManager) {
      const effects = structureManager.getStructureEffects(this.x, this.y);
      if (effects.nearHut) return true;
    }
    return false;
  }

  /**
   * Share knowledge (memories) with a socializing partner.
   * Transfers up to 2 high-significance memories to the partner,
   * with significance decay. Danger memories shared at full significance.
   */
  private shareKnowledge(partner: NPC): void {
    const myMemories = this.memory.getTopMemories(KNOWLEDGE_SHARE_POOL_SIZE);
    let shared = 0;

    for (const mem of myMemories) {
      if (shared >= KNOWLEDGE_SHARE_MAX) break;

      // Don't re-share memories that originated from the same source
      const sourceId = mem.sourceNpcId ?? this.id;
      const partnerMemories = partner.memory.getMemories();
      const alreadyHas = partnerMemories.some(
        pm => pm.sourceNpcId === sourceId && pm.type === mem.type &&
              Math.abs(pm.x - mem.x) < MEMORY_POSITION_THRESHOLD && Math.abs(pm.y - mem.y) < MEMORY_POSITION_THRESHOLD
      );
      if (alreadyHas) continue;

      // Danger and npc_died memories shared at full significance
      const isDanger = mem.type === 'danger' || mem.type === 'npc_died';
      const significance = isDanger ? mem.significance : mem.significance * 0.5;

      // Food/shelter knowledge: share if partner doesn't have memories near that location
      if (mem.type === 'found_food' || mem.type === 'found_shelter') {
        const partnerHasNearby = partnerMemories.some(
          pm => pm.type === mem.type && distance(pm.x, pm.y, mem.x, mem.y) < 10
        );
        if (partnerHasNearby) continue;
      }

      partner.memory.addMemory({
        type: mem.type,
        tick: partner.age,
        x: mem.x,
        y: mem.y,
        significance,
        relatedNpcId: mem.relatedNpcId,
        detail: mem.detail,
        sourceNpcId: sourceId,
      });
      shared++;
    }
  }
}
