import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { linearRegression, linearRegressionLine, mean, standardDeviation, sum } from 'simple-statistics';

import type { RootStackParamList } from '../navigation/types';
import { useAppShellStore } from '../store/appShellStore';
import { palette } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;
const chartConfig = {
    backgroundGradientFrom: palette.surface,
    backgroundGradientTo: palette.surface,
    color: (opacity = 1) => `rgba(164, 219, 102, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(224, 235, 222, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
};

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'AnalysisStatistics'>;

function generateCalorieTrendData() {
    // Mock data for 7 days of calorie intake
    const rawData = [1800, 2100, 1950, 2000, 2400, 2300, 2200];
    const points = rawData.map((val, idx) => [idx, val]);

    // Linear Regression Model
    const regressionResult = linearRegression(points);
    const findLineY = linearRegressionLine(regressionResult);

    const trendLine = rawData.map((_, idx) => findLineY(idx));

    return {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                data: rawData,
                color: (opacity = 1) => `rgba(164, 219, 102, ${opacity})`,
                strokeWidth: 2,
            },
            {
                data: trendLine,
                color: (opacity = 1) => `rgba(255, 100, 100, ${opacity})`,
                withDots: false,
                strokeWidth: 2,
            }
        ],
        equation: `y = ${regressionResult.m.toFixed(2)}x + ${regressionResult.b.toFixed(2)}`
    };
}

function generatePrepTimeVsDifficultyData() {
    // Mock Data: Easy, Medium, Hard
    const difficulties = [1, 2, 3];
    const rawTimes = [15, 35, 75]; // Exponential growth

    return {
        labels: ['Easy', 'Medium', 'Hard'],
        datasets: [
            {
                data: rawTimes
            }
        ]
    };
}

function generateConfidenceData() {
    // Mock data representing last 6 scans' accuracy
    const scores = [0.65, 0.70, 0.85, 0.82, 0.90, 0.95];

    // Math model: Normality / Mean
    const avg = mean(scores);

    return {
        labels: ['1', '2', '3', '4', '5', '6'],
        datasets: [{ data: scores.map(s => s * 100) }],
        average: avg * 100
    };
}

export function AnalysisStatisticsScreen({ navigation }: ScreenProps) {
    const { t } = useTranslation();
    const pantryIngredients = useAppShellStore((state) => state.pantryIngredients);

    // Math Model: Variance & Mean of Categories
    const categoryCounts = pantryIngredients.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Mock if empty
    const defaultCategories = { vegetable: 4, protein: 2, dairy: 1, fruit: 3 };
    const finalCategories = Object.keys(categoryCounts).length > 0 ? categoryCounts : defaultCategories;

    const pieData = Object.entries(finalCategories).map(([name, population], index) => {
        const colors = ['#A4DB66', '#FF9F40', '#FF6384', '#36A2EB', '#9966FF'];
        return {
            name,
            population,
            color: colors[index % colors.length],
            legendFontColor: palette.textSecondary,
            legendFontSize: 12
        };
    });

    const populations = Object.values(finalCategories);
    const categoryMean = populations.length > 0 ? mean(populations).toFixed(1) : '0';
    const categoryStdDev = populations.length > 0 ? standardDeviation(populations).toFixed(1) : '0';

    const calorieTrend = generateCalorieTrendData();
    const prepTime = generatePrepTimeVsDifficultyData();
    const confidence = generateConfidenceData();

    return (
        <LinearGradient colors={[palette.background, palette.backgroundAlt]} style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
                            <MaterialCommunityIcons color={palette.textPrimary} name="arrow-left" size={24} />
                        </Pressable>
                        <View style={styles.headerCopy}>
                            <Text style={styles.headerTitle}>{t('dataInsights')}</Text>
                            <Text style={styles.headerSubtitle}>{t('dataInsightsDesc')}</Text>
                        </View>
                    </View>

                    {/* CHART 1: Calories Trend */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{t('caloriesTrend')}</Text>
                        <Text style={styles.cardBody}>{t('caloriesTrendDesc')}</Text>
                        <View style={styles.chartContainer}>
                            <LineChart
                                data={calorieTrend}
                                width={screenWidth - 80}
                                height={220}
                                chartConfig={chartConfig}
                                bezier={false}
                                style={styles.chart}
                            />
                            <Text style={styles.modelText}>Model (Trendline): {calorieTrend.equation}</Text>
                        </View>
                    </View>

                    {/* CHART 2: Pantry Stats */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{t('pantryStats')}</Text>
                        <Text style={styles.cardBody}>{t('pantryStatsDesc')}</Text>
                        <View style={styles.chartContainer}>
                            <PieChart
                                data={pieData}
                                width={screenWidth - 80}
                                height={200}
                                chartConfig={chartConfig}
                                accessor="population"
                                backgroundColor="transparent"
                                paddingLeft="0"
                                absolute
                            />
                            <Text style={styles.modelText}>Mean: {categoryMean} | Std Dev: {categoryStdDev}</Text>
                        </View>
                    </View>

                    {/* CHART 3: Prep Time vs Difficulty */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{t('prepTimeVsDifficulty')}</Text>
                        <Text style={styles.cardBody}>{t('prepTimeVsDifficultyDesc')}</Text>
                        <View style={styles.chartContainer}>
                            <BarChart
                                data={prepTime}
                                width={screenWidth - 80}
                                height={220}
                                yAxisLabel=""
                                yAxisSuffix="m"
                                chartConfig={chartConfig}
                                style={styles.chart}
                                showValuesOnTopOfBars
                            />
                            <Text style={styles.modelText}>Mathematical Model: Exponential Growth Expected</Text>
                        </View>
                    </View>

                    {/* CHART 4: Confidence Scores */}
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>{t('confidenceScores')}</Text>
                        <Text style={styles.cardBody}>{t('confidenceScoresDesc')}</Text>
                        <View style={styles.chartContainer}>
                            <LineChart
                                data={confidence}
                                width={screenWidth - 80}
                                height={220}
                                yAxisLabel=""
                                yAxisSuffix="%"
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                            />
                            <Text style={styles.modelText}>Model (Mean Avg Accuracy): {confidence.average.toFixed(1)}%</Text>
                        </View>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40 },
    header: {
        alignItems: 'center', flexDirection: 'row', gap: 16, marginBottom: 22,
    },
    backButton: {
        alignItems: 'center', backgroundColor: palette.surface,
        borderColor: palette.outlineStrong, borderRadius: 999,
        borderWidth: 1, height: 46, justifyContent: 'center', width: 46,
    },
    headerCopy: { flex: 1 },
    headerTitle: { color: palette.textPrimary, fontSize: 28, fontWeight: '900' },
    headerSubtitle: { color: palette.textSecondary, fontSize: 14, marginTop: 6 },
    card: {
        backgroundColor: palette.surface, borderColor: palette.outlineStrong,
        borderRadius: 24, borderWidth: 1, marginBottom: 18, padding: 18,
    },
    cardLabel: {
        color: palette.primary, fontSize: 13, fontWeight: '900',
        letterSpacing: 1, textTransform: 'uppercase',
    },
    cardBody: {
        color: palette.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 8,
    },
    chartContainer: { marginTop: 16, alignItems: 'center' },
    chart: { borderRadius: 16 },
    modelText: {
        color: palette.primary, fontSize: 13, marginTop: 12, fontWeight: '700', textAlign: 'center'
    }
});
