# Filter System Integration Tests

The integration tests for the filter system have been organized into logical test modules for easier debugging and maintenance.

## Test Files Organization

### 1. **basic-field-filters.test.ts** (13 tests)
Tests filtering by individual field types with their respective operations:
- String fields: exact match, contains, starts_with, ends_with
- Boolean fields
- Integer fields
- Float fields
- Date fields
- DateTime fields
- Slug fields
- Text fields

**Tests**: 13
**Duration**: ~5-8 seconds

### 2. **logical-operators.test.ts** (6 tests)
Tests combining multiple filters using AND and OR operators:
- AND operator with multiple conditions
- OR operator with alternative conditions
- Nested AND/OR combinations
- Combined string and boolean filters
- Combined boolean and numeric filters
- Complex nested conditions

**Tests**: 6
**Duration**: ~5-7 seconds

### 3. **reference-filters.test.ts** (7 tests)
Tests filtering by reference and polymorphic reference fields:
- Single reference field filtering
- Reference field filtering by nested properties
- Multiple reference filtering
- Polymorphic reference filtering by type
- Polymorphic reference array filtering
- Polymorphic references by type-specific fields
- Multiple different types in polymorphic results

**Tests**: 7
**Duration**: ~8-10 seconds

### 4. **negative-cases.test.ts** (7 tests)
Tests that verify filters correctly **exclude** unwanted data:
- Unpublished posts excluded from published filter
- Low values excluded from high-value filters
- Non-matching strings excluded
- AND operator exclusion validation
- OR operator inclusion validation
- Reference filter exclusions
- Date range exclusions

**Tests**: 7
**Duration**: ~3-5 seconds

### 5. **array-filters.test.ts** (2 tests)
Tests filtering on array fields:
- Reference array field filtering
- String array field filtering (any/all/none operators)

**Tests**: 2
**Duration**: ~2-3 seconds

### 6. **complex-scenarios.test.ts** (5 tests)
Tests edge cases and advanced combinations:
- Case sensitivity in string filters
- Numeric field boundaries (min/max)
- Empty/null results handling
- String position filters (starts_with vs ends_with)
- Multiple field type combinations

**Tests**: 5
**Duration**: ~3-5 seconds

### 7. **setup.ts** (Shared)
Shared test setup and data generation function used by all test modules.

## Running Tests

### Run all split tests:
```bash
bun test tests/integration/basic-field-filters.test.ts \
           tests/integration/logical-operators.test.ts \
           tests/integration/reference-filters.test.ts \
           tests/integration/negative-cases.test.ts \
           tests/integration/array-filters.test.ts \
           tests/integration/complex-scenarios.test.ts
```

### Run specific test file:
```bash
# Run only reference filter tests
bun test tests/integration/reference-filters.test.ts

# Run only negative case tests
bun test tests/integration/negative-cases.test.ts
```

### Run with watch mode:
```bash
bun test --watch tests/integration/
```

## Test Statistics

- **Total Tests**: 40
- **Total Files**: 6 test modules + 1 setup module
- **Total Expected Duration**: ~35-40 seconds
- **Pass Rate**: 100%

## Benefits of This Organization

1. **Easier Debugging**: Focus on a specific filter type without running the entire 1200+ line file
2. **Better Maintenance**: Changes to one filter type don't require searching through a monolithic file
3. **Parallel Understanding**: Can understand each test module independently
4. **Faster Iterations**: Run only the tests relevant to your current task
5. **Clear Boundaries**: Each module has a specific focus and responsibility

## Filter Type Mapping

| Filter Type | Test File |
|-------------|-----------|
| String operations | `basic-field-filters.test.ts` |
| Numeric operations | `basic-field-filters.test.ts` |
| Boolean operations | `basic-field-filters.test.ts` |
| Date/DateTime operations | `basic-field-filters.test.ts` |
| AND/OR operators | `logical-operators.test.ts` |
| Nested conditions | `logical-operators.test.ts` |
| Reference fields | `reference-filters.test.ts` |
| Polymorphic references | `reference-filters.test.ts` |
| Array fields | `array-filters.test.ts` |
| Filter exclusions | `negative-cases.test.ts` |
| Edge cases | `complex-scenarios.test.ts` |

## Test Data

All tests use the same shared test data set up by `setupTestData()` from `setup.ts`:
- 3 test authors
- 7 blog posts (5 published, 2 draft)
- Additional products, events, reviews created as needed for specific tests

This ensures consistent test conditions across all test modules.
