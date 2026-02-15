import { describe, it, expect } from 'vitest';
import {
  createDefaultSkills,
  grantSkillXP,
  getSkillBonus,
  getSkillLabel,
  getBestSkill,
  type Skills,
} from './Skills';

describe('createDefaultSkills', () => {
  it('creates skills with all zeroes', () => {
    const skills = createDefaultSkills();
    expect(skills.foraging).toBe(0);
    expect(skills.building).toBe(0);
    expect(skills.crafting).toBe(0);
    expect(skills.socializing).toBe(0);
    expect(skills.exploring).toBe(0);
  });
});

describe('grantSkillXP', () => {
  it('increases skill level from zero', () => {
    const skills = createDefaultSkills();
    grantSkillXP(skills, 'foraging');
    expect(skills.foraging).toBeGreaterThan(0);
  });

  it('uses diminishing returns at higher levels', () => {
    const skills1 = createDefaultSkills();
    grantSkillXP(skills1, 'foraging', 0.1);
    const gainAtZero = skills1.foraging;

    const skills2 = createDefaultSkills();
    skills2.foraging = 0.5;
    const before = skills2.foraging;
    grantSkillXP(skills2, 'foraging', 0.1);
    const gainAtHalf = skills2.foraging - before;

    expect(gainAtZero).toBeGreaterThan(gainAtHalf);
  });

  it('caps skill level at 1.0', () => {
    const skills = createDefaultSkills();
    skills.foraging = 0.99;
    grantSkillXP(skills, 'foraging', 1.0);
    expect(skills.foraging).toBeLessThanOrEqual(1);
  });

  it('grants XP to the correct skill', () => {
    const skills = createDefaultSkills();
    grantSkillXP(skills, 'crafting');
    expect(skills.crafting).toBeGreaterThan(0);
    expect(skills.foraging).toBe(0);
    expect(skills.building).toBe(0);
  });

  it('accumulates XP with repeated calls', () => {
    const skills = createDefaultSkills();
    grantSkillXP(skills, 'exploring');
    const first = skills.exploring;
    grantSkillXP(skills, 'exploring');
    expect(skills.exploring).toBeGreaterThan(first);
  });
});

describe('getSkillBonus', () => {
  it('returns 1.0 at skill level 0', () => {
    const skills = createDefaultSkills();
    expect(getSkillBonus(skills, 'foraging')).toBe(1.0);
  });

  it('returns 1.5 at skill level 1.0', () => {
    const skills = createDefaultSkills();
    skills.foraging = 1.0;
    expect(getSkillBonus(skills, 'foraging')).toBe(1.5);
  });

  it('returns 1.25 at skill level 0.5', () => {
    const skills = createDefaultSkills();
    skills.building = 0.5;
    expect(getSkillBonus(skills, 'building')).toBeCloseTo(1.25);
  });
});

describe('getSkillLabel', () => {
  it('returns Novice for low levels', () => {
    expect(getSkillLabel(0)).toBe('Novice');
    expect(getSkillLabel(0.1)).toBe('Novice');
    expect(getSkillLabel(0.19)).toBe('Novice');
  });

  it('returns Apprentice for 0.2-0.39', () => {
    expect(getSkillLabel(0.2)).toBe('Apprentice');
    expect(getSkillLabel(0.3)).toBe('Apprentice');
  });

  it('returns Skilled for 0.4-0.59', () => {
    expect(getSkillLabel(0.4)).toBe('Skilled');
    expect(getSkillLabel(0.5)).toBe('Skilled');
  });

  it('returns Expert for 0.6-0.79', () => {
    expect(getSkillLabel(0.6)).toBe('Expert');
    expect(getSkillLabel(0.7)).toBe('Expert');
  });

  it('returns Master for 0.8+', () => {
    expect(getSkillLabel(0.8)).toBe('Master');
    expect(getSkillLabel(1.0)).toBe('Master');
  });
});

describe('getBestSkill', () => {
  it('returns the skill with highest level', () => {
    const skills: Skills = {
      foraging: 0.1,
      building: 0.5,
      crafting: 0.3,
      socializing: 0.2,
      exploring: 0.4,
    };
    const best = getBestSkill(skills);
    expect(best.skill).toBe('building');
    expect(best.label).toBe('Builder');
  });

  it('returns foraging when it is highest', () => {
    const skills: Skills = {
      foraging: 0.9,
      building: 0.1,
      crafting: 0.1,
      socializing: 0.1,
      exploring: 0.1,
    };
    expect(getBestSkill(skills).skill).toBe('foraging');
    expect(getBestSkill(skills).label).toBe('Forager');
  });

  it('returns first skill when all equal', () => {
    const skills = createDefaultSkills();
    expect(getBestSkill(skills).skill).toBe('foraging');
  });
});
