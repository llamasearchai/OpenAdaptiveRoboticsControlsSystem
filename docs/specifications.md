# Complete Program Plan: Adaptive Robotics Control System (ARCS)

## Program Overview

**Objective:** Build a production-grade learning-based robotics system that combines reinforcement learning, geometric reasoning, and model-based planning to solve long-horizon manipulation tasks under real-world constraints (latency <50ms, partial observability, contact-rich interactions).

**Duration:** 16 weeks (4 phases)  
**Team size:** 4-6 engineers (2 robotics/controls, 2 ML/RL, 1 simulation, 1 systems)

**Core Principles:**
- **Sim-to-real transfer** as first-class constraint (not an afterthought)
- **Hybrid methods**: combine model-based planning + model-free RL
- **Hierarchical policies**: skills + task planner for long-horizon reasoning
- **Uncertainty-aware**: quantify and act under sensor noise, model error, contact uncertainty

---

## Phase 1: Foundation & Single-Task Learning (Weeks 1-4)

### 1.1 Simulation Environment and Primitives

#### Task 1.1.1: Modular Simulation Stack
**Owner:** Simulation Engineer  
**Duration:** 1.5 weeks

**Subtasks:**
- **1.1.1.a** Build unified simulation interface over IsaacGym/MuJoCo/PyBullet
  ```python
  # coding_prompt_1_1_1_a.md
  """
  SimulationEnv abstract interface supporting multiple backends:
  
  class SimulationEnv(ABC):
      @abstractmethod
      def reset(self, seed: Optional[int] = None) -> Observation
      
      @abstractmethod
      def step(self, action: np.ndarray) -> Tuple[Observation, float, bool, Dict]
      
      @abstractmethod
      def get_state(self) -> State  # for checkpointing/planning
      
      @abstractmethod
      def set_state(self, state: State)  # for MPPI/planning rollouts
      
      @property
      @abstractmethod
      def action_space(self) -> gym.Space
      
      @property
      @abstractmethod
      def observation_space(self) -> gym.Space
  
  Observation dataclass:
      rgb: Optional[np.ndarray]  # [H, W, 3]
      depth: Optional[np.ndarray]  # [H, W]
      proprio: np.ndarray  # joint angles, velocities, forces
      tactile: Optional[np.ndarray]  # contact sensors
      timestep: int
      metadata: Dict
  
  Backends:
  - IsaacGymBackend (GPU-accelerated, parallel envs)
  - MuJoCoBackend (fast CPU, accurate contact)
  - PyBulletBackend (widely compatible, visualization)
  
  Support domain randomization hooks:
  - randomize_dynamics(mass_range, friction_range, damping_range)
  - randomize_visual(lighting, texture, camera_pose)
  - randomize_latency(action_delay_range)
  
  Design choice evidence:
  - IsaacGym provides 100-1000× speedup for parallel RL training [NVIDIA 2021]
  - Domain randomization improves sim-to-real transfer [OpenAI 2019, Peng et al. 2018]
  """
  ```

- **1.1.1.b** Implement domain randomization framework
  ```python
  # coding_prompt_1_1_1_b.md
  """
  DomainRandomizer applies structured randomization:
  
  class DomainRandomizer:
      def __init__(self, config: RandomizationConfig)
      
      def randomize_episode(self, env: SimulationEnv):
          # Called at episode start
          # Sample and apply physics, visual, sensor randomization
      
      def randomize_step(self, env: SimulationEnv):
          # Per-step randomization (lighting flicker, noise injection)
  
  RandomizationConfig:
      dynamics:
          mass_range: [0.8, 1.2]  # relative to nominal
          friction_range: [0.5, 1.5]
          damping_range: [0.8, 1.2]
      
      visual:
          lighting_intensity: [0.5, 2.0]
          camera_pose_noise: 0.02  # meters
          texture_randomization: true
      
      sensor:
          joint_position_noise: 0.001  # radians
          joint_velocity_noise: 0.01
          force_torque_noise: 0.5  # N or Nm
          camera_latency: [0, 0.05]  # seconds
      
      action:
          latency_range: [0, 0.03]  # action delay
          dropped_action_prob: 0.01
  
  Reference: ADR (Automatic Domain Randomization) [OpenAI 2020]
  Progressively increase randomization based on task success.
  """
  ```

- **1.1.1.c** Create standard manipulation tasks
  ```python
  # coding_prompt_1_1_1_c.md
  """
  Standard task suite for benchmarking:
  
  Tasks:
  1. ReachTarget: move end-effector to goal pose
  2. PickAndPlace: grasp object, place in goal region
  3. PegInHole: insert peg with <1mm clearance
  4. DoorOpening: rotate handle, pull door open
  5. CableRouting: route deformable cable through clips
  6. BlockStacking: stack 3-5 blocks in sequence
  
  Each task provides:
  - Observation space definition
  - Action space (joint velocities or end-effector deltas)
  - Reward function (dense + sparse)
  - Success metric (binary + quality score)
  - Reset distribution (object poses, initial state)
  
  class ManipulationTask(SimulationEnv):
      def compute_reward(self, obs: Observation, action: np.ndarray) -> float
      def is_success(self, obs: Observation) -> bool
      def get_info(self) -> Dict  # progress, subgoals, etc.
  
  Design reward shaping carefully:
  - Dense: distance to goal, alignment, contact stability
  - Sparse: task completion bonus
  - Penalty: collision, exceeding workspace, large actions
  
  Evidence: Dense rewards accelerate early learning but can cause suboptimal 
  local minima; combine with sparse task reward [Ng et al. 1999, Haarnoja et al. 2018]
  """
  ```

**Tests:**
```python
# test_simulation.py
def test_backend_compatibility():
    """All backends expose same interface"""
    for backend_cls in [IsaacGymBackend, MuJoCoBackend, PyBulletBackend]:
        env = backend_cls.create_env("PickAndPlace")
        obs = env.reset()
        
        assert hasattr(obs, 'proprio')
        assert hasattr(obs, 'rgb')
        
        action = env.action_space.sample()
        obs, reward, done, info = env.step(action)
        
        assert isinstance(reward, float)
        assert isinstance(done, bool)

def test_domain_randomization():
    """Randomization produces diverse episodes"""
    env = MuJoCoBackend.create_env("PickAndPlace")
    randomizer = DomainRandomizer(default_config)
    
    mass_values = []
    friction_values = []
    
    for _ in range(100):
        randomizer.randomize_episode(env)
        mass_values.append(env.get_object_mass("cube"))
        friction_values.append(env.get_friction("cube"))
    
    # Check distribution coverage
    assert np.std(mass_values) > 0.1
    assert 0.8 * nominal_mass < min(mass_values)
    assert max(mass_values) < 1.2 * nominal_mass

def test_isaacgym_parallel_speedup():
    """IsaacGym parallelization delivers speedup"""
    env_single = IsaacGymBackend.create_env("ReachTarget", num_envs=1)
    env_parallel = IsaacGymBackend.create_env("ReachTarget", num_envs=256)
    
    # Collect 10k steps
    time_single = benchmark_rollout(env_single, steps=10000)
    time_parallel = benchmark_rollout(env_parallel, steps=10000)
    
    speedup = time_single / time_parallel
    print(f"IsaacGym speedup: {speedup:.1f}×")
    assert speedup > 50  # expect >50× for 256 parallel envs

def test_task_reward_functions():
    """Reward functions guide toward success"""
    env = MuJoCoBackend.create_env("PickAndPlace")
    
    # Test reward progression
    obs = env.reset()
    rewards = []
    
    for _ in range(100):
        # Apply actions toward goal
        action = compute_optimal_action(obs, env.goal)
        obs, reward, done, info = env.step(action)
        rewards.append(reward)
        
        if done and info['is_success']:
            break
    
    # Reward should increase monotonically (mostly)
    assert rewards[-10:].mean() > rewards[:10].mean()
    assert info['is_success']
```

**Output expectations:**
- IsaacGym: >10,000 FPS rollout for simple reach task (256 parallel envs, RTX 4090)
- MuJoCo: 500-1000 FPS single env, accurate contact dynamics
- Domain randomization: <5% overhead per step
- Standard tasks: all runnable on all backends with consistent success metrics

---

#### Task 1.1.2: Geometric Reasoning and Kinematics Library
**Owner:** Robotics Engineer  
**Duration:** 1 week

**Subtasks:**
- **1.1.2.a** Build SE(3) and screw theory utilities
  ```python
  # coding_prompt_1_1_2_a.md
  """
  Geometric primitives for manipulation:
  
  class SE3:
      '''Special Euclidean group SE(3) = R^3 × SO(3)'''
      def __init__(self, rotation: SO3, translation: np.ndarray)
      
      def inverse(self) -> SE3
      def compose(self, other: SE3) -> SE3
      def transform_point(self, point: np.ndarray) -> np.ndarray
      def to_matrix(self) -> np.ndarray  # 4×4 homogeneous
      def to_twist(self) -> np.ndarray  # 6D velocity
      
      @classmethod
      def from_xyz_quat(cls, xyz, quat) -> SE3
      
      @classmethod
      def exp(cls, twist: np.ndarray) -> SE3  # exponential map
  
  class SO3:
      '''Special Orthogonal group SO(3) = 3D rotations'''
      def __init__(self, matrix: np.ndarray)
      
      @classmethod
      def from_quat(cls, quat) -> SO3
      @classmethod
      def from_euler(cls, roll, pitch, yaw) -> SO3
      @classmethod
      def from_rotvec(cls, rotvec) -> SO3
      
      def to_quat(self) -> np.ndarray
      def log(self) -> np.ndarray  # axis-angle
  
  Reference: Murray, Li, Sastry "A Mathematical Introduction to Robotic Manipulation"
  Modern Robotics (Lynch & Park) textbook
  
  Use well-tested libraries (scipy.spatial.transform) where appropriate,
  wrap in clean API.
  """
  ```

- **1.1.2.b** Implement forward/inverse kinematics solver
  ```python
  # coding_prompt_1_1_2_b.md
  """
  Kinematics for common robot arms (UR5, Franka, Kuka):
  
  class KinematicsSolver:
      def __init__(self, urdf_path: str)
      
      def forward_kinematics(self, 
                            joint_angles: np.ndarray,
                            link_name: str = "end_effector") -> SE3
      
      def inverse_kinematics(self,
                            target_pose: SE3,
                            q_init: Optional[np.ndarray] = None,
                            max_iters: int = 100) -> Optional[np.ndarray]
      
      def jacobian(self, joint_angles: np.ndarray) -> np.ndarray  # 6×n
      
      def compute_joint_limits_penalty(self, q: np.ndarray) -> float
      
      def is_self_collision(self, q: np.ndarray) -> bool
  
  IK solver options:
  - Analytical (for 6-DOF arms with spherical wrist)
  - Numerical (damped least squares, Levenberg-Marquardt)
  - Optimization-based (SciPy minimize with constraints)
  
  For RL policies: FK is called every step for reward; must be fast (<0.1ms).
  IK used for initialization/scripted primitives.
  
  Evidence: Damped least squares IK converges in 10-20 iterations for 
  typical reaching tasks [Buss & Kim 2005]
  """
  ```

- **1.1.2.c** Add collision checking and workspace constraints
  ```python
  # coding_prompt_1_1_2_c.md
  """
  Collision checking for safe motion:
  
  class CollisionChecker:
      def __init__(self, robot_urdf: str, scene_meshes: List[Mesh])
      
      def check_collision(self, q: np.ndarray) -> bool
      
      def check_collision_trajectory(self, 
                                      trajectory: np.ndarray) -> List[int]
          # Returns indices of collision configurations
      
      def compute_signed_distance(self, 
                                   q: np.ndarray,
                                   link_name: str,
                                   obstacle: str) -> float
  
  Use library backends:
  - FCL (Flexible Collision Library): fast C++ collision
  - PyBullet collision queries
  - Custom sphere/capsule approximations for RL (faster)
  
  Tradeoff: accurate mesh collision (slow) vs primitive approximations (fast but conservative)
  For RL training: use fast conservative checks
  For deployment: use accurate checks
  """
  ```

**Tests:**
```python
# test_kinematics.py
def test_se3_composition():
    """SE(3) group properties"""
    T1 = SE3.from_xyz_quat([0.5, 0, 0], [0, 0, 0, 1])
    T2 = SE3.from_xyz_quat([0, 0.3, 0], [0, 0, 0, 1])
    
    T12 = T1.compose(T2)
    
    # Check associativity
    T3 = SE3.from_xyz_quat([0, 0, 0.2], [0, 0, 0, 1])
    assert_transforms_close((T1.compose(T2)).compose(T3),
                           T1.compose(T2.compose(T3)))
    
    # Check inverse
    T_identity = T1.compose(T1.inverse())
    assert np.allclose(T_identity.to_matrix(), np.eye(4), atol=1e-6)

def test_forward_kinematics():
    """FK matches known poses"""
    robot = KinematicsSolver("assets/robots/ur5e.urdf")
    
    # Test canonical poses
    q_home = np.array([0, -90, 90, -90, -90, 0]) * np.pi/180
    T = robot.forward_kinematics(q_home, "tool0")
    
    # UR5e home should be roughly [0.5, 0, 0.5]
    assert np.allclose(T.translation, [0.817, -0.191, 0.005], atol=0.01)

def test_inverse_kinematics_consistency():
    """IK followed by FK returns original pose"""
    robot = KinematicsSolver("assets/robots/franka_panda.urdf")
    
    for _ in range(100):
        # Sample random feasible pose
        q_random = robot.sample_joint_angles()
        T_target = robot.forward_kinematics(q_random, "panda_hand")
        
        # Solve IK
        q_ik = robot.inverse_kinematics(T_target)
        
        if q_ik is not None:
            T_check = robot.forward_kinematics(q_ik, "panda_hand")
            
            pos_error = np.linalg.norm(T_check.translation - T_target.translation)
            rot_error = np.linalg.norm(T_check.rotation.log() - T_target.rotation.log())
            
            assert pos_error < 0.001  # 1mm
            assert rot_error < 0.01  # ~0.5 degrees

def test_collision_checking_performance():
    """Collision checks fast enough for RL loop"""
    robot = KinematicsSolver("assets/robots/ur5e.urdf")
    checker = CollisionChecker(robot, scene_meshes=load_test_scene())
    
    q_samples = [robot.sample_joint_angles() for _ in range(1000)]
    
    start = time.time()
    results = [checker.check_collision(q) for q in q_samples]
    elapsed = time.time() - start
    
    checks_per_sec = 1000 / elapsed
    print(f"Collision checks: {checks_per_sec:.0f} Hz")
    assert checks_per_sec > 5000  # must be >5kHz for RL loop
```

**Output expectations:**
- SE(3) operations: <10 μs per operation
- FK: <100 μs per call (compatible with 10kHz control loop)
- IK: convergence in <5ms for typical reaching (close initial guess)
- Collision check: >5000 Hz for sphere/capsule approximation

---

### 1.2 Reinforcement Learning Foundation

#### Task 1.2.1: Policy Representation and Training Infrastructure
**Owner:** ML Engineer  
**Duration:** 2 weeks

**Subtasks:**
- **1.2.1.a** Implement policy network architectures
  ```python
  # coding_prompt_1_2_1_a.md
  """
  Policy architectures for continuous control:
  
  class MLPPolicy(nn.Module):
      '''Standard feedforward policy for proprioceptive tasks'''
      def __init__(self, 
                   obs_dim: int,
                   action_dim: int,
                   hidden_dims: List[int] = [256, 256],
                   activation: str = 'relu'):
          # Output: Gaussian with diagonal covariance
          # mean and log_std heads
      
      def forward(self, obs: torch.Tensor) -> Distribution
      
      def act(self, obs: torch.Tensor, 
              deterministic: bool = False) -> torch.Tensor
  
  class VisuomotorPolicy(nn.Module):
      '''Vision + proprioception for manipulation'''
      def __init__(self,
                   image_encoder: str = 'resnet18',  # or 'efficientnet'
                   proprio_dim: int,
                   action_dim: int):
          # Architecture:
          # RGB → CNN → flatten → concat(proprio) → MLP → action
          # Use pretrained vision encoder (ImageNet or R3M)
      
      def forward(self, image: torch.Tensor, 
                  proprio: torch.Tensor) -> Distribution
  
  class RecurrentPolicy(nn.Module):
      '''LSTM/GRU for partial observability'''
      def __init__(self, obs_dim, action_dim, 
                   hidden_size: int = 256,
                   num_layers: int = 2):
          # For tasks with occlusion or velocity estimation
      
      def forward(self, obs_seq: torch.Tensor, 
                  hidden: Optional[Tuple]) -> Tuple[Distribution, Tuple]
  
  Design choices:
  - Activation: ReLU standard; ELU/GELU for smoother gradients
  - Initialization: orthogonal for weights, zero for final layer (small initial actions)
  - Action distribution: Gaussian with learned std or state-dependent std
  
  Evidence: 
  - Diagonal Gaussian sufficient for most manipulation [Haarnoja et al. 2018]
  - State-dependent covariance helps exploration [Fujimoto et al. 2018]
  - Pretrained vision encoders accelerate learning [Nair et al. 2022, Radosavovic et al. 2023]
  """
  ```

- **1.2.1.b** Build RL training loop with PPO/SAC
  ```python
  # coding_prompt_1_2_1_b.md
  """
  Implement model-free RL algorithms:
  
  class PPO:
      '''Proximal Policy Optimization - stable on-policy method'''
      def __init__(self,
                   policy: nn.Module,
                   value_fn: nn.Module,
                   learning_rate: float = 3e-4,
                   clip_ratio: float = 0.2,
                   entropy_coef: float = 0.01):
      
      def update(self, rollout_buffer: RolloutBuffer) -> Dict[str, float]:
          # Compute advantages (GAE-lambda)
          # Multiple epochs of minibatch updates
          # Clip policy ratio, value loss
          # Return metrics: policy_loss, value_loss, entropy, kl_div
      
      def collect_rollouts(self, 
                          env: VectorizedEnv,
                          n_steps: int) -> RolloutBuffer
  
  class SAC:
      '''Soft Actor-Critic - sample-efficient off-policy method'''
      def __init__(self,
                   policy: nn.Module,
                   q_networks: List[nn.Module],  # twin Q
                   learning_rate: float = 3e-4,
                   tau: float = 0.005,
                   alpha: float = 0.2):  # entropy coefficient
      
      def update(self, batch: ReplayBuffer.Sample) -> Dict[str, float]:
          # Update critics, then actor, then temperature
          # Return: q_loss, policy_loss, alpha_loss
      
      def collect_experience(self, 
                             env: VectorizedEnv,
                             n_steps: int,
                             replay_buffer: ReplayBuffer)
  
  Design choices:
  - PPO for stable on-policy learning (robotics standard)
  - SAC for sample efficiency when sim is slow or for real-robot fine-tuning
  - Hyperparameters from RL Zoo3 for continuous control
  
  Evidence:
  - PPO achieves stable learning on manipulation [Andrychowicz et al. 2020]
  - SAC more sample-efficient but can be less stable [Haarnoja et al. 2018]
  - Twin Q-networks + delayed policy updates critical for SAC [Fujimoto et al. 2018]
  """
  ```

- **1.2.1.c** Add distributed training with IsaacGym
  ```python
  # coding_prompt_1_2_1_c.md
  """
  Leverage GPU-parallelized simulation:
  
  class IsaacGymPPO:
      '''PPO optimized for IsaacGym parallel envs'''
      def __init__(self,
                   policy: nn.Module,
                   value_fn: nn.Module,
                   num_envs: int = 4096,
                   device: str = 'cuda:0'):
          # All envs + policy on same GPU for zero-copy
      
      def train(self, total_timesteps: int):
          for iteration in range(total_timesteps // (num_envs * n_steps)):
              # Collect n_steps from all envs in parallel
              # Move to GPU, compute advantages
              # Update policy with minibatch SGD
              # Log: mean_reward, episode_length, policy_loss, fps
      
      def evaluate(self, n_episodes: int = 100) -> Dict[str, float]:
          # Run deterministic policy, measure success rate
  
  Optimization:
  - Keep all tensors on GPU (observations, actions, rewards)
  - Fuse operators where possible (advantage computation)
  - Use mixed precision (FP16 for forward pass, FP32 for updates)
  
  Expected throughput:
  - 50k-100k FPS on RTX 4090 with 4096 parallel envs
  - Train simple reach task to 95% success in <5 minutes
  
  Evidence: IsaacGym enables 1000× faster RL training vs CPU simulation
  [Makoviychuk et al. 2021, Rudin et al. 2022]
  """
  ```

**Tests:**
```python
# test_rl.py
def test_policy_forward_pass():
    """Policy outputs valid action distribution"""
    policy = MLPPolicy(obs_dim=20, action_dim=7, hidden_dims=[256, 256])
    
    obs = torch.randn(32, 20)
    dist = policy(obs)
    
    assert isinstance(dist, torch.distributions.Normal)
    assert dist.mean.shape == (32, 7)
    assert dist.stddev.shape == (32, 7)
    
    # Sample actions
    actions = dist.sample()
    assert actions.shape == (32, 7)
    
    # Compute log prob
    log_prob = dist.log_prob(actions).sum(dim=-1)
    assert log_prob.shape == (32,)

def test_ppo_update():
    """PPO update reduces surrogate loss"""
    env = make_vectorized_env("ReachTarget", num_envs=64)
    policy = MLPPolicy(obs_dim=env.observation_space.shape[0],
                      action_dim=env.action_space.shape[0])
    value_fn = ValueNetwork(obs_dim=env.observation_space.shape[0])
    
    ppo = PPO(policy, value_fn)
    
    # Collect rollout
    rollout = ppo.collect_rollouts(env, n_steps=128)
    
    # Initial loss
    initial_metrics = ppo.compute_loss(rollout)
    initial_loss = initial_metrics['policy_loss']
    
    # Update
    for _ in range(10):
        metrics = ppo.update(rollout)
    
    # Loss should decrease
    final_loss = metrics['policy_loss']
    assert final_loss < initial_loss

def test_isaacgym_ppo_throughput():
    """IsaacGym PPO achieves high FPS"""
    env = IsaacGymEnv("ReachTarget", num_envs=2048, device='cuda:0')
    policy = MLPPolicy(...).cuda()
    value_fn = ValueNetwork(...).cuda()
    
    trainer = IsaacGymPPO(policy, value_fn, num_envs=2048)
    
    # Measure throughput
    start = time.time()
    trainer.train(total_timesteps=100_000)
    elapsed = time.time() - start
    
    fps = 100_000 / elapsed
    print(f"Training throughput: {fps:.0f} FPS")
    
    assert fps > 30_000  # expect >30k FPS on modern GPU

def test_reach_task_learning():
    """Agent learns simple reach task"""
    env = IsaacGymEnv("ReachTarget", num_envs=1024)
    policy = MLPPolicy(obs_dim=env.observation_space.shape[0],
                      action_dim=env.action_space.shape[0])
    value_fn = ValueNetwork(...)
    
    trainer = IsaacGymPPO(policy, value_fn, num_envs=1024)
    
    # Train for 1M steps
    trainer.train(total_timesteps=1_000_000)
    
    # Evaluate
    metrics = trainer.evaluate(n_episodes=100)
    
    print(f"Success rate: {metrics['success_rate']:.1%}")
    print(f"Mean episode reward: {metrics['mean_reward']:.2f}")
    
    assert metrics['success_rate'] > 0.90  # >90% success on reach
```

**Output expectations:**
- PPO training: 30,000-100,000 FPS on RTX 4090 (2048-4096 parallel envs)
- Simple reach task: 90%+ success in 1M timesteps (~5-10 minutes wall time)
- Pick-and-place: 70%+ success in 10M timesteps (~1 hour)
- Visuomotor policy: 50%+ success in 50M timesteps (~few hours)

---

#### Task 1.2.2: Imitation Learning and Demonstration Collection
**Owner:** ML Engineer  
**Duration:** 1.5 weeks

**Subtasks:**
- **1.2.2.a** Build teleoperation interface for data collection
  ```python
  # coding_prompt_1_2_2_a.md
  """
  Teleoperation for collecting human demonstrations:
  
  class TeleoperationInterface:
      def __init__(self,
                   device: Literal['spacemouse', 'vr', 'keyboard'],
                   control_mode: Literal['joint', 'end_effector']):
      
      def read_input(self) -> Action
          # Poll device, map to robot action space
      
      def send_command(self, env: SimulationEnv, action: Action)
      
      def record_demonstration(self, 
                               env: SimulationEnv,
                               save_path: str) -> Demonstration
  
  Demonstration dataclass:
      observations: List[Observation]
      actions: List[np.ndarray]
      rewards: List[float]
      metadata: Dict  # task, device, operator_id, timestamp
  
  Design:
  - End-effector control (6D delta pose) is easier for humans than joint control
  - Inverse kinematics converts EE commands to joint velocities
  - Record at control frequency (10-30 Hz typical for manipulation)
  - Support VR controllers (Oculus Quest) for immersive teleoperation
  
  Evidence: Imitation learning requires 10-1000 demos depending on task complexity
  [Mandlekar et al. 2021, Zhao et al. 2023]
  Teleoperation quality (smoothness, success rate) matters for BC performance
  [Kelly et al. 2019]
  """
  ```

- **1.2.2.b** Implement Behavioral Cloning (BC)
  ```python
  # coding_prompt_1_2_2_b.md
  """
  Behavioral Cloning: supervised learning on expert demonstrations
  
  class BehavioralCloning:
      def __init__(self,
                   policy: nn.Module,
                   learning_rate: float = 1e-4,
                   batch_size: int = 256):
      
      def train(self, 
                demonstrations: List[Demonstration],
                val_split: float = 0.1,
                epochs: int = 100) -> Dict[str, List[float]]:
          # Split train/val
          # Train with supervised MSE or NLL loss
          # Return: train_loss_curve, val_loss_curve
      
      def evaluate_policy(self, 
                          env: SimulationEnv,
                          n_episodes: int = 50) -> Dict[str, float]:
          # Rollout learned policy, measure success rate
  
  class DAgger:
      '''Dataset Aggregation: iterative BC with expert corrections'''
      def __init__(self, policy: nn.Module, expert: Callable):
      
      def train(self, 
                env: SimulationEnv,
                n_iterations: int = 10,
                rollouts_per_iter: int = 50):
          for i in range(n_iterations):
              # 1. Rollout current policy
              # 2. Query expert for corrections
              # 3. Aggregate to dataset
              # 4. Train BC on aggregated data
  
  Design:
  - Action representation: absolute vs relative important
  - Observation normalization: compute mean/std from demos
  - Data augmentation: jitter poses, flip images (if symmetric task)
  
  Evidence: 
  - BC works well for simple tasks but suffers from distribution shift [Ross et al. 2011]
  - DAgger mitigates covariate shift by querying expert on policy rollouts [Ross et al. 2011]
  - BC → RL fine-tuning often outperforms pure RL [Rajeswaran et al. 2018]
  """
  ```

- **1.2.2.c** Add data augmentation and quality filtering
  ```python
  # coding_prompt_1_2_2_c.md
  """
  Improve demonstration data quality:
  
  class DemonstrationFilter:
      def filter_by_success(self, demos: List[Demonstration]) -> List[Demonstration]:
          # Keep only successful trajectories
      
      def filter_by_smoothness(self, 
                                demos: List[Demonstration],
                                threshold: float = 0.1) -> List[Demonstration]:
          # Remove jerky/unstable demos (high action variance)
      
      def trim_trajectories(self, demos: List[Demonstration]) -> List[Demonstration]:
          # Remove pre-task and post-task idle frames
  
  class DemonstrationAugmenter:
      def augment_visual(self, obs: Observation) -> Observation:
          # Color jitter, brightness, contrast
          # Gaussian noise, blur
      
      def augment_spatial(self, 
                          demo: Demonstration,
                          pose_noise: float = 0.01) -> Demonstration:
          # Add small noise to object/target poses
          # Recompute actions via IK
      
      def temporal_subsampling(self, 
                               demo: Demonstration,
                               factor: int = 2) -> Demonstration:
          # Reduce frequency for training (e.g. 30 Hz → 15 Hz)
  
  Evidence: 
  - Data quality matters more than quantity for BC [Mandlekar et al. 2018]
  - Visual augmentation improves generalization [Laskin et al. 2020]
  """
  ```

**Tests:**
```python
# test_imitation.py
def test_teleoperation_recording():
    """Collect demonstration via teleoperation"""
    env = MuJoCoBackend.create_env("PickAndPlace")
    teleop = TeleoperationInterface(device='keyboard', control_mode='end_effector')
    
    # Simulate human input (for test, use scripted policy)
    scripted_expert = ScriptedPickAndPlace()
    
    demo = record_scripted_demo(env, scripted_expert, max_steps=200)
    
    assert len(demo.observations) == len(demo.actions)
    assert len(demo.observations) <= 200
    assert demo.metadata['success'] == True

def test_bc_training():
    """BC policy imitates expert"""
    # Load demonstrations
    demos = load_demonstrations("data/pick_place_demos_100.pkl")
    
    policy = MLPPolicy(obs_dim=..., action_dim=...)
    bc = BehavioralCloning(policy)
    
    history = bc.train(demos, epochs=50)
    
    # Loss should decrease
    assert history['train_loss'][-1] < history['train_loss'][0]
    
    # Evaluate in sim
    env = MuJoCoBackend.create_env("PickAndPlace")
    metrics = bc.evaluate_policy(env, n_episodes=50)
    
    print(f"BC success rate: {metrics['success_rate']:.1%}")
    # With 100 good demos, expect >50% success
    assert metrics['success_rate'] > 0.40

def test_dagger_improvement():
    """DAgger improves over vanilla BC"""
    demos_initial = load_demonstrations("data/pick_place_demos_50.pkl")
    expert = ScriptedPickAndPlace()
    
    # Train vanilla BC
    policy_bc = MLPPolicy(...)
    bc = BehavioralCloning(policy_bc)
    bc.train(demos_initial, epochs=50)
    bc_success = bc.evaluate_policy(env, n_episodes=50)['success_rate']
    
    # Train DAgger
    policy_dagger = MLPPolicy(...)
    dagger = DAgger(policy_dagger, expert)
    dagger.train(env, n_iterations=5, rollouts_per_iter=20)
    dagger_success = dagger.evaluate_policy(env, n_episodes=50)['success_rate']
    
    print(f"BC: {bc_success:.1%}, DAgger: {dagger_success:.1%}")
    assert dagger_success > bc_success + 0.10  # expect >10% improvement

def test_demonstration_quality_filtering():
    """Filtering improves BC performance"""
    # Mix good and bad demos
    demos_raw = load_demonstrations("data/mixed_quality_demos.pkl")
    
    filter = DemonstrationFilter()
    demos_clean = filter.filter_by_success(demos_raw)
    demos_clean = filter.filter_by_smoothness(demos_clean)
    
    # Train on raw
    policy_raw = MLPPolicy(...)
    bc_raw = BehavioralCloning(policy_raw)
    bc_raw.train(demos_raw, epochs=50)
    
    # Train on clean
    policy_clean = MLPPolicy(...)
    bc_clean = BehavioralCloning(policy_clean)
    bc_clean.train(demos_clean, epochs=50)
    
    success_raw = bc_raw.evaluate_policy(env, n_episodes=50)['success_rate']
    success_clean = bc_clean.evaluate_policy(env, n_episodes=50)['success_rate']
    
    print(f"Raw: {success_raw:.1%}, Filtered: {success_clean:.1%}")
    assert success_clean > success_raw
```

**Output expectations:**
- Teleoperation: collect 10-20 demos/hour (depends on task complexity)
- BC training: 50-100 epochs in <10 minutes for 100 demos
- BC success rate: 40-70% on pick-and-place with 50-100 demos
- DAgger: +10-20% success improvement vs vanilla BC with 5 iterations

---

### 1.3 Sim-to-Real Validation (Initial)

#### Task 1.3.1: Sim-to-Real Transfer Baseline
**Owner:** Robotics Engineer  
**Duration:** 1 week

**Subtasks:**
- **1.3.1.a** Set up real robot testing infrastructure
  ```python
  # coding_prompt_1_3_1_a.md
  """
  Real robot interface matching simulation API:
  
  class RealRobotEnv(SimulationEnv):
      '''Interface to physical robot (ROS or direct SDK)'''
      def __init__(self,
                   robot_type: str = 'franka',
                   control_freq: float = 30.0,  # Hz
                   camera_config: CameraConfig):
      
      def reset(self) -> Observation:
          # Move to home pose, wait for settle
          # Capture observation
      
      def step(self, action: np.ndarray) -> Tuple[Observation, float, bool, Dict]:
          # Send command via robot controller
          # Wait for next control cycle
          # Read sensors
          # Return observation
      
      def emergency_stop(self):
          # Immediate halt
      
      def is_safe(self) -> bool:
          # Check force limits, singularities, workspace bounds
  
  Safety considerations:
  - Hardware limits: joint position/velocity/torque limits
  - Collision detection: force/torque thresholds, external E-stop
  - Workspace boundaries: cartesian limits, forbidden zones
  - Action filtering: low-pass filter, rate limits
  
  Integration:
  - ROS: publish to /joint_velocity_controller/command, subscribe to /joint_states
  - Franka FCI: libfranka direct C++ control
  - Universal Robots: URScript or RTDE interface
  
  Evidence: Action filtering (smoothing, rate limiting) critical for stable 
  RL policy deployment [Johannink et al. 2019, Levine et al. 2016]
  """
  ```

- **1.3.1.b** Implement system identification for dynamics
  ```python
  # coding_prompt_1_3_1_b.md
  """
  Measure real robot parameters to improve sim accuracy:
  
  class SystemID:
      def __init__(self, robot: RealRobotEnv, sim: SimulationEnv):
      
      def calibrate_friction(self) -> Dict[str, float]:
          # Excite joints, measure torque vs velocity
          # Fit Coulomb + viscous friction model per joint
      
      def calibrate_mass_inertia(self,
                                  object_name: str) -> Dict[str, float]:
          # Lift object, measure required torques
          # Inverse dynamics to estimate mass/inertia
      
      def calibrate_camera_extrinsics(self) -> SE3:
          # ArUco board, ChArUco, or AprilTag calibration
          # Return camera pose in robot base frame
      
      def update_simulation(self, sim: SimulationEnv):
          # Write identified parameters back to sim
  
  Typical workflow:
  1. Run excitation trajectories on real robot
  2. Record joint states + measured torques
  3. Fit physics parameters (friction, damping, mass)
  4. Update sim URDF/XML with identified values
  5. Validate: compare sim vs real on test trajectory
  
  Evidence: System ID reduces sim-to-real gap but doesn't eliminate it;
  combine with domain randomization [Tan et al. 2018]
  """
  ```

- **1.3.1.c** Create sim-to-real evaluation protocol
  ```python
  # coding_prompt_1_3_1_c.md
  """
  Structured evaluation of transfer quality:
  
  class SimToRealEvaluator:
      def __init__(self, 
                   sim_env: SimulationEnv,
                   real_env: RealRobotEnv,
                   policy: nn.Module):
      
      def eval_sim(self, n_episodes: int = 100) -> Metrics:
          # Evaluate policy in sim
      
      def eval_real(self, n_episodes: int = 20) -> Metrics:
          # Evaluate same policy on real robot
          # Include safety checks, human monitoring
      
      def compute_transfer_gap(self) -> TransferGap:
          metrics_sim = self.eval_sim()
          metrics_real = self.eval_real()
          
          return TransferGap(
              success_rate_gap=metrics_sim.success - metrics_real.success,
              trajectory_divergence=compute_dtw_distance(...),
              timing_mismatch=abs(metrics_sim.episode_length - metrics_real.episode_length)
          )
  
  Safety protocol for real evals:
  - Operator present with E-stop
  - Start with slow execution (0.5× speed)
  - Soft objects before rigid
  - Gradually increase difficulty
  - Stop if 3 consecutive failures or unsafe behavior
  
  Evidence: Sim-to-real gap quantification guides which optimizations matter
  [Pinto et al. 2018, OpenAI 2018]
  """
  ```

**Tests:**
```python
# test_sim2real.py (requires real hardware)
@pytest.mark.hardware
def test_real_robot_basic_motion():
    """Real robot executes basic motion safely"""
    robot = RealRobotEnv(robot_type='franka')
    
    


**Tests (continued):**
```python
# test_sim2real.py (continued)

    # Move to home
    obs_initial = robot.reset()
    assert np.all(np.abs(obs_initial.proprio) < 2 * np.pi)  # valid angles
    
    # Send small, safe action
    action = np.zeros(robot.action_space.shape)
    obs_next, _, _, info = robot.step(action)
    
    # Check control frequency
    time_delta = info['timestamp'] - obs_initial.metadata['timestamp']
    target_dt = 1.0 / robot.control_freq
    assert abs(time_delta - target_dt) < 0.005  # within 5ms jitter

@pytest.mark.hardware
def test_system_id_friction():
    """Identify friction matches spec"""
    robot = RealRobotEnv()
    sim = MuJoCoBackend.create_env("ReachTarget")
    sys_id = SystemID(robot, sim)
    
    # Run simple calibration
    friction_coeffs = sys_id.calibrate_friction()
    
    # Validating against known hardware specs (e.g. Franka)
    # Typical Coulomb friction is ~0.5-2.0 Nm depending on joint
    assert all(0.1 < f < 5.0 for f in friction_coeffs.values())
    
    # Update sim and check rollout match
    sys_id.update_simulation(sim)
    
    # Run identical trajectories
    traj_real = robot.execute_scripted_trajectory("sine_wave")
    traj_sim = sim.execute_scripted_trajectory("sine_wave")
    
    # MSE should be lower after calibration
    mse = np.mean((traj_real.positions - traj_sim.positions)**2)
    print(f"Sim-Real Tracking MSE: {mse:.4f}")
    assert mse < 0.01  # rad^2

@pytest.mark.hardware
def test_sim_to_real_gap():
    """Quantify success rate gap"""
    # Load trained policy
    policy = torch.load("checkpoints/reach_policy_best.pt")
    
    evaluator = SimToRealEvaluator(sim_env, real_env, policy)
    gap = evaluator.compute_transfer_gap()
    
    print(f"Sim Success: {gap.metrics_sim.success:.1%}")
    print(f"Real Success: {gap.metrics_real.success:.1%}")
    
    # Initial expectation: sim > real
    # With domain randomization, gap should be reasonable (<30%)
    assert gap.success_rate_gap < 0.30
```

**Output expectations:**
- **Control loop:** Stable 30Hz-100Hz control on real hardware with <5ms jitter.
- **System ID:** Reduce sim-to-real tracking error (MSE) by >50% compared to default URDF parameters.
- **Transfer:** Simple "Reach" task transfers with >80% success on real robot without fine-tuning (zero-shot) using domain randomization.

---

## Phase 2: Advanced Perception & Planning (Weeks 5-8)

### 2.1 Sensor Fusion and State Estimation

#### Task 2.1.1: Visuomotor Representation Learning
**Owner:** ML Engineer  
**Duration:** 2 weeks

**Subtasks:**
- **2.1.1.a** Integrate pre-trained visual encoders (R3M / VIP / DINOv2)
  ```python
  # coding_prompt_2_1_1_a.md
  """
  Visual backbone integration:
  
  class VisionBackbone(nn.Module):
      def __init__(self, model_name: str = 'r3m-resnet50', 
                   freeze_backbone: bool = True):
          # Load R3M / VIP / CLIP / DINOv2 weights
          # Remove classification head
          # Add spatial softmax or adaptors if needed
      
      def forward(self, images: torch.Tensor) -> torch.Tensor:
          # Input: [B, C, H, W] -> Output: [B, EmbeddingDim]
  
  Design choice:
  - R3M (Ego4D) / VIP: trained on human videos, good for manipulation
  - Freeze backbone initially to avoid catastrophic forgetting during RL
  - Add "Spatial Softmax" layer to extract keypoint-like features from feature maps
  
  Evidence: Pre-trained representations (R3M, VIP) significantly improve 
  sample efficiency for manipulation vs training from scratch [Nair et al. 2022, Ma et al. 2023]
  """
  ```

- **2.1.1.b** Multimodal sensor fusion (Proprio + Vision + Force)
  ```python
  # coding_prompt_2_1_1_b.md
  """
  Sensor fusion architecture:
  
  class MultimodalEncoder(nn.Module):
      def __init__(self, vision_dim, proprio_dim, force_dim):
          # Encoders
          self.vis_enc = VisionBackbone(...)
          self.prop_enc = MLP(proprio_dim, 128)
          self.force_enc = MLP(force_dim, 64)
          
          # Fusion: Concatenation or Transformer
          self.fusion = nn.Sequential(
              nn.Linear(vis_dim + 128 + 64, 256),
              nn.LayerNorm(256),
              nn.ReLU()
          )
          # Transformer fusion variant (optional for robustness)
          self.attn_fusion = TransformerEncoder(...)
      
      def forward(self, obs_dict):
          # Handle missing modalities (e.g. occlusion) via dropout during training
          # "Modality Dropout": random zeroing of vision or force
  
  Evidence: Modality dropout makes policy robust to sensor failure 
  and partial observability [Lee et al. 2019]
  """
  ```

**Tests:**
```python
# test_perception.py
def test_vision_encoder_loading():
    """Encoder loads and produces correct embedding shape"""
    encoder = VisionBackbone('resnet18-pretrained')
    img = torch.zeros(1, 3, 224, 224)
    emb = encoder(img)
    assert emb.shape == (1, 512)  # ResNet18 feature dim

def test_multimodal_fusion_robustness():
    """Fusion handles missing modalities (dropout)"""
    model = MultimodalEncoder(...)
    
    # Complete input
    out_full = model({'vision': v, 'proprio': p, 'force': f})
    
    # Missing vision (simulate occlusion/dropout)
    out_blind = model({'vision': torch.zeros_like(v), 'proprio': p, 'force': f})
    
    # Outputs should not be identical, but should be valid
    assert not torch.allclose(out_full, out_blind)
    assert out_blind.isfinite().all()

def test_visual_sim_to_real_consistency():
    """Encoder produces similar embeddings for sim and real images"""
    # Load matched sim/real image pair (from dataset)
    img_sim = load_image("sim_cube.png")
    img_real = load_image("real_cube.png")
    
    encoder = VisionBackbone('r3m')
    
    emb_sim = encoder(preprocess(img_sim))
    emb_real = encoder(preprocess(img_real))
    
    # Cosine similarity
    sim_score = torch.nn.functional.cosine_similarity(emb_sim, emb_real)
    print(f"Sim-to-Real visual similarity: {sim_score.item():.3f}")
    
    # Expect high similarity for domain-invariant encoders
    assert sim_score > 0.8
```

**Output expectations:**
- **Representation:** Zero-shot visual similarity >0.8 between domain-randomized sim and real images.
- **Inference speed:** Full multimodal encoder <10ms on GPU (critical for real-time control).

---

### 2.2 Model-Based Planning and Control

#### Task 2.2.1: Model Predictive Control (MPC) with Learned Models
**Owner:** Robotics/Controls Engineer  
**Duration:** 2 weeks

**Subtasks:**
- **2.2.1.a** Learn world model (Forward Dynamics)
  ```python
  # coding_prompt_2_2_1_a.md
  """
  Learn dynamics model: s_{t+1} = f(s_t, a_t)
  
  class DynamicsModel(nn.Module):
      def __init__(self, state_dim, action_dim, ensemble_size=5):
          # Ensemble of Probabilistic MLPs (Gaussian output)
          # Ensembling captures epistemic uncertainty (model error)
          self.models = nn.ModuleList([
              ProbabilisticMLP(state_dim + action_dim, state_dim) 
              for _ in range(ensemble_size)
          ])
      
      def predict(self, state, action):
          # Return mean, var from each ensemble member
          # Shape: [Ensemble, Batch, StateDim]
  
  Training:
  - Collect interaction data
  - Train via Maximum Likelihood (minimize NLL)
  - Use TS-1 (Trajectory Sampling) for propagation
  
  Evidence: Ensemble of probabilistic networks (PETS) captures uncertainty 
  effective for planning [Chua et al. 2018]
  """
  ```

- **2.2.1.b** Implement MPPI (Model Predictive Path Integral) Controller
  ```python
  # coding_prompt_2_2_1_b.md
  """
  Sampling-based MPC controller:
  
  class MPPIController:
      def __init__(self, 
                   dynamics_model: Callable, 
                   reward_fn: Callable,
                   horizon: int = 20,
                   n_samples: int = 1000,
                   temperature: float = 1.0):
      
      def get_action(self, current_state: np.ndarray) -> np.ndarray:
          # 1. Sample N trajectories (random action sequences)
          # 2. Propagate using dynamics_model (parallel batch)
          # 3. Evaluate rewards for each trajectory
          # 4. Compute weighted average of first actions (softmax weights)
          # 5. Shift sequences, return action
  
  Optimization:
  - JIT compile dynamics and reward (JAX/TorchScript)
  - Run massive parallel sampling on GPU
  
  Tradeoff:
  - MPPI handles non-smooth/discontinuous dynamics well (contact)
  - Requires fast model inference
  """
  ```

**Tests:**
```python
# test_planning.py
def test_dynamics_model_learning():
    """Dynamics model reduces prediction error"""
    dataset = load_interaction_data()
    model = DynamicsModel(...)
    
    # Train
    train_loss = model.train(dataset, epochs=50)
    
    # Test prediction
    s, a, next_s = dataset.sample(10)
    pred_dist = model.predict(s, a)
    
    # Check log likelihood or MSE
    mse = ((pred_dist.mean - next_s)**2).mean()
    assert mse < 0.01  # reasonable prediction accuracy

def test_mppi_planning_sim():
    """MPPI solves task using ground-truth dynamics"""
    env = MuJoCoBackend.create_env("ReachTarget")
    
    # Use ground truth simulator as "model" for initial test
    def perfect_model(state, actions):
        # Rollout in cloned envs
        return env.rollout_batch(state, actions)
    
    mppi = MPPIController(dynamics_model=perfect_model, reward_fn=env.compute_reward)
    
    obs = env.reset()
    total_reward = 0
    for _ in range(50):
        action = mppi.get_action(obs)
        obs, r, done, _ = env.step(action)
        total_reward += r
        if done: break
        
    assert done  # Should reach goal
    assert total_reward > 0

def test_mppi_inference_speed():
    """MPPI runs at control frequency"""
    # Mock model
    model = lambda s, a: s + a
    mppi = MPPIController(model, ...)
    
    start = time.time()
    for _ in range(100):
        mppi.get_action(np.zeros(10))
    elapsed = time.time() - start
    
    freq = 100 / elapsed
    print(f"MPPI Frequency: {freq:.1f} Hz")
    assert freq > 30.0  # Real-time requirement
```

**Output expectations:**
- **Dynamics Model:** Prediction error < 5% on 1-step horizon on test set.
- **MPPI:** >30 Hz planning loop (with 1000 samples/step) on GPU.
- **Behavior:** Capable of "local" obstacle avoidance and reaching without explicit policy training.

---

## Phase 3: Long-Horizon & Robustness (Weeks 9-12)

### 3.1 Hierarchical Learning and Skills

#### Task 3.1.1: Skill Library and Primitive Learning
**Owner:** ML Engineer  
**Duration:** 2 weeks

**Subtasks:**
- **3.1.1.a** Define Options/Skills framework
  ```python
  # coding_prompt_3_1_1_a.md
  """
  Semi-Markov Decision Process (SMDP) structure:
  
  class Skill(ABC):
      @abstractmethod
      def can_initiate(self, state) -> bool: ...
      @abstractmethod
      def policy(self, state) -> action: ...
      @abstractmethod
      def has_terminated(self, state) -> bool: ...
  
  Implement library of parameterized skills:
  1. Reaching(target_pose)
  2. Grasping(object_id, width)
  3. Pushing(direction, distance)
  4. Screwing(axis, rotations)
  
  Learning:
  - Pre-train individual skills via RL (Goal-Conditioned RL)
  - Or script primitives with operational space control (OSC)
  
  Evidence: Parameterized skills (like parameterized motion primitives) 
  simplify long-horizon exploration [Konidaris et al. 2009, Dalal et al. 2021]
  """
  ```

- **3.1.1.b** Train High-Level Task Planner
  ```python
  # coding_prompt_3_1_1_b.md
  """
  Hierarchical RL (High-level policy):
  
  class TaskPlanner(nn.Module):
      '''Selects skill and arguments'''
      def __init__(self, state_dim, num_skills, skill_arg_dims):
          # Output: Categorical(skill_id) + Continuous(skill_args)
      
      def forward(self, state) -> (skill_idx, skill_args)
  
  Training:
  - Train planner to sequence pre-trained skills
  - Sparse reward: Task completion only
  - Env steps = 1 skill execution (temporal abstraction)
  """
  ```

**Tests:**
```python
# test_hierarchy.py
def test_skill_termination():
    """Skills terminate correctly"""
    skill = ReachSkill(target=np.array([0.5, 0, 0.5]))
    
    # State far away
    assert not skill.has_terminated(state_far)
    
    # State at target
    assert skill.has_terminated(state_at_target)

def test_planner_sequencing():
    """Planner chains Reach -> Grasp"""
    env = MuJoCoBackend.create_env("PickAndPlace")
    planner = TaskPlanner(...)
    
    # Mock training/execution
    state = env.reset()
    
    # Step 1: Planner chooses Reach
    skill_idx, args = planner.act(state)
    assert skill_names[skill_idx] == "Reach"
    
    # Execute Reach (mock)
    state_near_obj = mock_execute(env, "Reach", args)
    
    # Step 2: Planner chooses Grasp
    skill_idx, args = planner.act(state_near_obj)
    assert skill_names[skill_idx] == "Grasp"
```

**Output expectations:**
- **Skill Reliability:** Primitives succeed >95% when preconditions met.
- **Horizon:** Solve "Pick-Place-Stack" (3 blocks) which is impossible for flat RL in reasonable time.

---

### 3.2 Robustness to Partial Observability

#### Task 3.2.1: Recurrent State Estimation
**Owner:** ML Engineer  
**Duration:** 1 week

**Subtasks:**
- **3.2.1.a** Implement History-based Policy (LSTM/Transformer)
  - Replace MLP backbone with LSTM or Transformer Block.
  - Input: Sequence of last $K$ observations (e.g., $K=10$).
  - Purpose: Infer unobserved properties (object weight, friction, occlusion).

- **3.2.1.b** Add State Estimator (Filter)
  - Explicit Extended Kalman Filter (EKF) or Particle Filter for object pose tracking using visual observations.
  - Fuse vision detection with physics propagation.

**Tests:**
```python
# test_robustness.py
def test_memory_policy_heavy_object():
    """Recurrent policy adapts to hidden mass"""
    env = IsaacGymEnv("PushBlock", hidden_param="mass")
    policy = RecurrentPolicy(...)
    
    # Rollout with heavy block
    env.set_mass(5.0) # Nominal is 1.0
    hidden = None
    
    rewards = []
    for t in range(50):
        # Policy should adapt action magnitude over time as it "feels" the mass
        obs = env.get_obs()
        action, hidden = policy(obs, hidden)
        _, r, _, _ = env.step(action)
        rewards.append(r)
    
    # Performance should improve in later steps
    assert np.mean(rewards[-10:]) > np.mean(rewards[:10])
```

**Output expectations:**
- **Adaptation:** Policy adapts to 2x mass change or friction change within 1-2 seconds of interaction.
- **Occlusion:** Maintain tracking/control during 0.5s visual occlusion.

---

## Phase 4: Production & Scale (Weeks 13-16)

### 4.1 Deployment Pipeline

#### Task 4.1.1: Containerized Robot Runtime
**Owner:** Systems Engineer  
**Duration:** 2 weeks

**Subtasks:**
- **4.1.1.a** Dockerize Control Stack
  - Real-time kernel patch compatibility.
  - ROS2 / DDS communication layer.
  - Inference server (ONNXRuntime / TensorRT) for policies.
  - Safety monitor watchdog process.

- **4.1.1.b** Continuous Integration for Policies
  - **Sim Regression:** Before deployment, run policy on 100 sim seeds.
  - **Hardware-in-Loop (HIL) Smoke Test:** Run "air moves" (robot moving without object) to verify kinematics/safety on real hardware automatically (if safe) or prompt for human verification.

### 4.2 Knowledge & Tooling

#### Task 4.2.1: Experiment Tracker & Viz
**Owner:** Full Team  
**Duration:** 1 week

**Subtasks:**
- **4.2.1.a** Centralized dashboard (WandB / MLflow).
  - Track: Reward curves, Success rates, Sim-Real gap metrics.
  - Video artifacts: Save snippets of failures.
- **4.2.1.b** "Replay Theatre"
  - Tool to visualize sim logs and real robot logs side-by-side (3D visualizer).

---

## Acceptance Criteria and Final Deliverables

### Functional Requirements
| Requirement | Test | Success Metric |
| :--- | :--- | :--- |
| **Sim Throughput** | `test_isaacgym_ppo_throughput` | >30k FPS (training) |
| **Control Frequency** | `test_mppi_inference_speed` | >30 Hz (planning), >100Hz (policy) |
| **Sim-to-Real** | `test_sim_to_real_gap` | Gap < 20% success rate drop |
| **Robustness** | `test_memory_policy_heavy_object` | Adapt to 2x mass/friction var |
| **Long-Horizon** | Block Stacking Task | Stack 3 blocks success > 60% |

### Deliverables
1.  **ARCS Repository:** Monorepo with `sim/`, `real/`, `learning/`, `planning/`.
2.  **Model Zoo:** Pre-trained policies for standard tasks (Reach, Pick, Insert).
3.  **Sim-Real Pipeline:** automated calibration and deployment scripts.
4.  **Documentation:** "Adding a new Task" guide, "Robot Operator Manual".

### Risks and Mitigations
| Risk | Mitigation |
| :--- | :--- |
| **Sim-Real Gap too large** | Increase domain randomization range; Improve System ID; Switch to DAgger on real robot. |
| **Inference Latency** | Distill MPPI/Planner into policy network (Policy Distillation); Optimize GPU kernels (TensorRT). |
| **Safety Incidents** | Hard-coded Cartesian limits; Force-torque limits; Dead-man switch requirement; Low-speed mode default. |

---

## Example Demo Script: "Sim-to-Real Pick & Place"

```bash
# 1. Train Policy in Sim
python train_rl.py task=PickAndPlace algo=PPO --headless
# Output: checkpoints/pick_place_ppo.pt (Success: 92% in sim)

# 2. Evaluate in Sim with Randomization (Stress Test)
python eval_sim.py model=checkpoints/pick_place_ppo.pt randomization=hard
# Output: Success: 85% (Robustness verified)

# 3. System ID on Real Robot (Optional but recommended)
python run_sys_id.py robot=franka
# Output: updated assets/robots/franka_calibrated.xml

# 4. Deploy to Real Robot
# Start hardware interface
ros2 launch franka_control control.launch.py &

# Run policy
python deploy_policy.py \
    model=checkpoints/pick_place_ppo.pt \
    robot_ip=192.168.1.100 \
    safety_mode=strict

# Console Output:
# [INFO] Connecting to robot... OK
# [INFO] Loading policy... OK (TensorRT optimized)
# [INFO] Camera latency: 32ms
# [INFO] Control loop: 30Hz
# [INFO] Waiting for E-Stop release...
# [INFO] Executing...
# [SUCCESS] Object placed in bin. Cycle time: 4.2s.
```

This plan provides a first-principles path from simulation primitives to a robust, learning-based real-robot control system, addressing the specific constraints of latency, reliability, and long-horizon reasoning.

This continues the detailed program plan, focusing on **optimization-based methods** (a key requirement in your description), expanding the **production tooling** implementation, and detailing the strategy for **leveling up the team**.

---

### 2.2 Model-Based Planning (Continued)

#### Task 2.2.2: Trajectory Optimization (iLQR / OSQP)
**Owner:** Controls Engineer
**Duration:** 1.5 weeks

**Rationale:** While MPPI (sampling-based) handles contact well, gradient-based optimization is often superior for precision tasks or smoothing RL outputs.

**Subtasks:**
- **2.2.2.a** Implement Iterative Linear Quadratic Regulator (iLQR)
  ```python
  # coding_prompt_2_2_2_a.md
  """
  Differentiable Trajectory Optimizer:
  
  class iLQRPlanner:
      def __init__(self, 
                   dynamics_fn: Callable,  # Analytical or Learned (must be differentiable)
                   cost_fn: Callable, 
                   horizon: int = 50):
      
      def plan(self, initial_state: np.ndarray, initial_guess: np.ndarray) -> np.ndarray:
          # Backward pass: compute value gradients (Q_x, Q_u, Q_xx, Q_uu)
          # Forward pass: roll out new trajectory with linear feedback policy
          # Line search: ensure cost improvement
          # Return: optimized action sequence
  
  Requirements:
  - Use JAX or PyTorch for auto-differentiation of dynamics/cost.
  - Cost function: quadratic tracking error + control effort.
  - Latency: <50ms for 50-step horizon.
  """
  ```

- **2.2.2.b** Integration as a "Reflex" Layer
  - Run iLQR on top of RL policy output to enforce smoothness or constraints.
  - "Filter" RL actions through a kinematic feasibility optimizer (using OSQP for convex constraints like joint limits).

**Tests:**
```python
# test_optimization.py
def test_ilqr_stabilization():
    """iLQR stabilizes a double pendulum"""
    # Simple analytical dynamics for test
    dynamics = DoublePendulumDynamics() 
    planner = iLQRPlanner(dynamics, cost_fn=quadratic_cost, horizon=50)
    
    state = np.array([0.1, 0.0, 0.0, 0.0]) # Small perturbation
    guess = np.zeros((50, 2)) # Zero control guess
    
    optimized_actions = planner.plan(state, guess)
    
    # Simulate
    final_state = rollout(dynamics, state, optimized_actions)
    
    # Should be closer to upright (0,0) than initial
    assert np.linalg.norm(final_state) < np.linalg.norm(state)

def test_qp_constraint_enforcement():
    """QP solver enforces joint limits"""
    # q_next = q + v * dt
    # Constraint: q_min <= q_next <= q_max
    
    solver = KinematicOptimizer(limits=franka_limits)
    
    # Request motion violating limit
    unsafe_action = np.array([10.0, 0, 0, 0, 0, 0, 0]) 
    current_q = np.array([2.8, 0, 0, 0, 0, 0, 0]) # Near limit
    
    safe_action = solver.filter(unsafe_action, current_q)
    
    next_q = current_q + safe_action * 0.01
    assert next_q[0] <= franka_limits.max[0]
```

---

## Phase 4 Implementation Details: Production & Scale

### 4.1 Deployment Pipeline (Detailed)

#### Task 4.1.1: Containerized Robot Runtime
**Owner:** Systems Engineer
**Duration:** 2 weeks

**Subtasks:**
- **4.1.1.a** Base Docker Image for Real-Time Control
  ```dockerfile
  # coding_prompt_4_1_1_a.md
  """
  Dockerfile.robot:
  
  FROM nvcr.io/nvidia/pytorch:24.01-py3
  
  # Real-time kernel setup
  RUN apt-get install -y linux-tools-generic hwloc
  
  # Install Robot Drivers (e.g., Franka FCI, UR RTDE)
  RUN apt-get install -y libfranka-dev
  
  # Install ROS2 (Humble) - if used as middleware
  # ... (ROS setup)
  
  # ARCS Library
  COPY . /app/arcs
  RUN pip install -e /app/arcs
  
  # Set real-time priority limits in entrypoint
  ENTRYPOINT ["/app/arcs/scripts/entrypoint_rt.sh"]
  """
  ```

- **4.1.1.b** Hardware-in-Loop (HIL) Smoke Tests
  ```python
  # coding_prompt_4_1_1_b.md
  """
  Automated safety check before enabling full control:
  
  def run_hil_safety_check(robot_interface):
      # 1. Sensor Health
      assert robot_interface.read_sensors().frequency > 28.0 # Hz check
      
      # 2. Emergency Stop Status
      assert not robot_interface.is_estopped()
      
      # 3. Air Move (Micro-motion)
      initial_q = robot_interface.get_joints()
      # Command tiny wiggle
      target_q = initial_q + 0.01 
      robot_interface.move_joint(target_q)
      
      final_q = robot_interface.get_joints()
      assert np.linalg.norm(final_q - target_q) < 0.005
      
      print("HIL Safety Check Passed")
  """
  ```

### 4.2 Knowledge & Tooling (Leveling Up the Team)

#### Task 4.2.1: Experiment Tracker & "Robot Zoo"
**Owner:** Full Team
**Duration:** 1 week

**Subtasks:**
- **4.2.1.a** Unified Experiment Logging Schema
  ```python
  # coding_prompt_4_2_1_a.md
  """
  Standardize metrics across the team:
  
  class ExperimentLogger:
      def log_episode(self, 
                      step: int, 
                      metrics: Dict[str, float], 
                      video: Optional[np.ndarray]):
          # Upload to WandB / MLFlow
          
          # Compute standardized robotics metrics:
          # - Success Rate
          # - Time to Completion
          # - Path Length (efficiency)
          # - Force/Torque Energy (smoothness)
          # - Safety Violations (collisions)
  """
  ```

- **4.2.1.b** The "Robot Zoo" (Model Registry)
  - **Artifacts:** `policy_v1.pt`, `dynamics_model_v3.ckpt`, `calibration_config_2024_01.yaml`
  - **Metadata:** "Trained on IsaacGym commit #abc", "Verified on Franka #3".

#### Task 4.2.2: Team "Gym" Challenges
**Activity:**
- **Weekly Challenge:** Release a new task (e.g., "Stack 4 blocks") in the shared `SimulationEnv`.
- **Leaderboard:** Track algorithms based on (1) Success Rate, (2) Inference Latency, (3) Sim-to-Real transferability (tested on Friday).
- **Goal:** Gamify the improvement of the core algorithms.

---

## Detailed Output Expectations & Success Metrics

### 1. Algorithm Performance
| Component | Metric | Target |
| :--- | :--- | :--- |
| **PPO Policy** | Convergence Time (Wall) | < 10 mins (Reach), < 1 hour (Pick-Place) |
| **MPPI Planner** | Control Freq (GPU) | > 30 Hz (1024 samples) |
| **Visual Encoder** | Latency | < 10 ms (ResNet18 / R3M) |
| **Sim-to-Real** | Success Rate Drop | < 20% (e.g., 95% Sim -> 75% Real) |

### 2. Engineering Quality
| Component | Metric | Target |
| :--- | :--- | :--- |
| **Simulation** | FPS (Training) | > 30,000 FPS (IsaacGym) |
| **Codebase** | Test Coverage | > 80% (Core Modules) |
| **Deployment** | "One-Click" Deploy | Docker build + deploy < 5 mins |

---

## Final Deliverable Artifacts (The "How-To" for the Team)

1.  **`arcs-core` Python Package:**
    - `arcs.sim`: Unified backend (Isaac/MuJoCo).
    - `arcs.algo`: PPO, SAC, BC, MPPI, iLQR implementations.
    - `arcs.robot`: Hardware interfaces (ROS2/Franka).
    - `arcs.vis`: Visualization & logging tools.

2.  **The "Cookbook" (Documentation):**
    - "How to add a new robot."
    - "How to train a policy from scratch."
    - "Checklist for Sim-to-Real transfer."

3.  **Benchmark Suite:**
    - Standardized set of 5 tasks (Reach, Push, Pick, Insert, Stack) running nightly in CI to prevent regression.

This complete plan addresses the "first-principles" aspect by building the stack from the ground up (geometry, dynamics, optimization) while ensuring it solves "real product challenges" via the heavy focus on sim-to-real transfer, latency constraints, and reliability testing.

